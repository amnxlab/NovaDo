"""
Google Calendar OAuth and Integration Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request, Query
from fastapi.responses import RedirectResponse
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Ensure .env is loaded (in case this module is imported before main.py loads it)
load_dotenv()

# Google OAuth imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest

router = APIRouter()


def get_google_client_id():
    """Get GOOGLE_CLIENT_ID at runtime"""
    return os.getenv("GOOGLE_CLIENT_ID", "")


def get_google_client_secret():
    """Get GOOGLE_CLIENT_SECRET at runtime"""
    return os.getenv("GOOGLE_CLIENT_SECRET", "")


def get_google_redirect_uri():
    """Get GOOGLE_REDIRECT_URI at runtime"""
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/api/calendar/callback")

# OAuth scopes for Google Calendar
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

# Store OAuth states temporarily (in production, use Redis or database)
oauth_states = {}


class ImportRequest(BaseModel):
    import_as: str = "tasks"  # "tasks" or "events"
    calendar_id: str = "primary"
    days_back: int = 30
    days_forward: int = 90


class CalendarEvent(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    start: datetime
    end: Optional[datetime] = None
    all_day: bool = False
    location: Optional[str] = None


def get_oauth_flow():
    """Create OAuth flow with client config"""
    client_id = get_google_client_id()
    client_secret = get_google_client_secret()
    redirect_uri = get_google_redirect_uri()
    
    if not client_id or not client_secret:
        return None
    
    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow


def get_credentials_from_user(user: dict) -> Optional[Credentials]:
    """Get Google credentials from user data"""
    if not user.get("googleAccessToken"):
        return None
    
    creds = Credentials(
        token=user.get("googleAccessToken"),
        refresh_token=user.get("googleRefreshToken"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=get_google_client_id(),
        client_secret=get_google_client_secret(),
        scopes=SCOPES
    )
    
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            # Update tokens in database
            db = get_database()
            db.users.update_one(
                {"_id": ObjectId(user["_id"])},
                {"$set": {
                    "googleAccessToken": creds.token,
                    "googleRefreshToken": creds.refresh_token
                }}
            )
        except Exception as e:
            print(f"Failed to refresh token: {e}")
            return None
    
    return creds


class CalendarSelection(BaseModel):
    calendar_ids: List[str]


@router.get("/config")
async def get_calendar_config():
    """Get Google Calendar configuration status"""
    client_id = get_google_client_id()
    client_secret = get_google_client_secret()
    is_configured = bool(client_id and client_secret)
    return {
        "configured": is_configured,
        "message": "Google Calendar is configured" if is_configured else "Google Calendar credentials not set. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file."
    }


@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Check Google Calendar connection status"""
    has_access = bool(current_user.get("googleAccessToken"))
    has_refresh = bool(current_user.get("googleRefreshToken"))
    
    logger.info(f"DEBUG: Calendar Status Check - User: {current_user.get('username')}, Access: {has_access}, Refresh: {has_refresh}")
    
    # Relaxed check: connected if we have access token. 
    # Refresh token might be missing if re-authed without consent, but access still works for 1h.
    is_connected = has_access 
    
    google_email = current_user.get("googleEmail")
    
    return {
        "connected": is_connected,
        "email": google_email if is_connected else None,
        "configured": bool(get_google_client_id() and get_google_client_secret()),
        "warning": "Refresh token missing - connection will expire" if (is_connected and not has_refresh) else None
    }


@router.get("/auth")
async def start_google_auth(current_user: dict = Depends(get_current_user)):
    """Start Google OAuth flow - returns authorization URL"""
    if not get_google_client_id() or not get_google_client_secret():
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file."
        )
    
    flow = get_oauth_flow()
    if not flow:
        raise HTTPException(status_code=500, detail="Failed to create OAuth flow")
    
    # Generate authorization URL
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    
    # Store state with user ID for callback in DATABASE (persistent)
    user_id = str(current_user.get("_id"))
    logger.info(f"DEBUG: Starting OAuth - User: {user_id}, State: {state}")
    db = get_database()
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": user_id,
        "created_at": datetime.now()
    })
    
    return {
        "authorization_url": authorization_url,
        "state": state
    }


@router.get("/callback")
async def google_auth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None)
):
    """Handle Google OAuth callback - automatically import calendar after connection"""
    logger.info(f"DEBUG: OAuth Callback - Code: {bool(code)}, State: {state}, Error: {error}")
    # Check for errors
    if error:
        return RedirectResponse(
            url=f"/?google_auth=error&message={error}",
            status_code=302
        )
    
    if not code or not state:
        return RedirectResponse(
            url="/?google_auth=error&message=Missing authorization code",
            status_code=302
        )
    
    # Verify state from DATABASE
    db = get_database()
    state_data = await db.oauth_states.find_one({"state": state})
    
    if not state_data:
        return RedirectResponse(
            url="/?google_auth=error&message=Invalid state parameter",
            status_code=302
        )
    
    user_id = state_data["user_id"]
    # Clean up state
    await db.oauth_states.delete_one({"_id": state_data["_id"]})
    
    try:
        flow = get_oauth_flow()
        if not flow:
            raise Exception("Failed to create OAuth flow")
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info from Google
        service = build("oauth2", "v2", credentials=credentials)
        user_info = service.userinfo().get().execute()
        
        # Update user in database
        db = get_database()
        
        # Default to selecting primary calendar if not set
        current_selection = await db.users.find_one({"_id": ObjectId(user_id)}, {"googleSelectedCalendars": 1})
        selected_calendars = current_selection.get("googleSelectedCalendars", ["primary"]) if current_selection else ["primary"]

        update_data = {
            "googleAccessToken": credentials.token,
            "googleEmail": user_info.get("email"),
            "googleConnectedAt": datetime.now(),
            "googleSelectedCalendars": selected_calendars
        }
        
        if credentials.refresh_token:
            update_data["googleRefreshToken"] = credentials.refresh_token

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        return RedirectResponse(
            url=f"/?google_auth=success",
            status_code=302
        )
        
    except Exception as e:
        logger.exception("Google auth callback error")
        return RedirectResponse(
            url=f"/?google_auth=error&message=Authentication failed: {str(e)}",
            status_code=302
        )


@router.post("/disconnect")
async def disconnect_google(current_user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar and delete synced events"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Delete all synced Google Calendar events for this user
    # Mongita doesn't support $exists, so we fetch and filter manually
    all_tasks = await db.tasks.find({"user": user_oid}).to_list(None)
    synced_tasks = [t for t in all_tasks if t.get("googleEventId")]
    deleted_count = 0
    for task in synced_tasks:
        await db.tasks.delete_one({"_id": task["_id"]})
        deleted_count += 1
    
    # Remove Google credentials - use $set with None since Mongita doesn't support $unset
    await db.users.update_one(
        {"_id": user_oid},
        {"$set": {
            "googleAccessToken": None,
            "googleRefreshToken": None,
            "googleEmail": None,
            "googleConnectedAt": None,
            "googleSelectedCalendars": None,
            "lastCalendarSync": None
        }}
    )
    
    return {
        "message": "Google Calendar disconnected",
        "eventsDeleted": deleted_count
    }


@router.get("/calendars")
async def list_calendars(current_user: dict = Depends(get_current_user)):
    """List user's Google Calendars"""
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        calendars_result = service.calendarList().list().execute()
        calendars = calendars_result.get("items", [])
        
        # Get selected calendars from user profile
        selected_ids = current_user.get("googleSelectedCalendars", ["primary"])
        
        return {
            "calendars": [
                {
                    "id": cal["id"],
                    "name": cal["summary"],
                    "primary": cal.get("primary", False),
                    "color": cal.get("backgroundColor", "#4772fa"),
                    "selected": cal["id"] in selected_ids
                }
                for cal in calendars
            ]
        }
    except Exception as e:
        print(f"List calendars error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list calendars: {str(e)}")


@router.post("/calendars/select")
async def select_calendars(
    selection: CalendarSelection,
    current_user: dict = Depends(get_current_user)
):
    """Update selected Google Calendars"""
    db = get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"googleSelectedCalendars": selection.calendar_ids}}
    )
    
    return {"message": "Calendar selection updated", "selected": selection.calendar_ids}


@router.get("/events")
async def get_events(
    calendar_id: str = "primary",
    days_back: int = 30,
    days_forward: int = 90,
    current_user: dict = Depends(get_current_user)
):
    """Get events from Google Calendar"""
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        
        # Calculate time range
        now = datetime.utcnow()
        time_min = (now - timedelta(days=days_back)).isoformat() + "Z"
        time_max = (now + timedelta(days=days_forward)).isoformat() + "Z"
        
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=500
        ).execute()
        
        events = events_result.get("items", [])
        
        formatted_events = []
        for event in events:
            start = event.get("start", {})
            end = event.get("end", {})
            
            # Determine if all-day event
            is_all_day = "date" in start
            
            if is_all_day:
                start_dt = datetime.fromisoformat(start["date"])
                end_dt = datetime.fromisoformat(end["date"]) if end.get("date") else None
            else:
                start_str = start.get("dateTime", "")
                end_str = end.get("dateTime", "")
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00")) if start_str else None
                end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00")) if end_str else None
            
            if start_dt:
                formatted_events.append({
                    "id": event.get("id"),
                    "title": event.get("summary", "Untitled"),
                    "description": event.get("description", ""),
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat() if end_dt else None,
                    "all_day": is_all_day,
                    "location": event.get("location"),
                    "status": event.get("status"),
                    "html_link": event.get("htmlLink")
                })
        
        return {
            "events": formatted_events,
            "count": len(formatted_events)
        }
        
    except Exception as e:
        print(f"Get events error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get events: {str(e)}")


@router.post("/import")
async def import_calendar(
    request: ImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Import events from Google Calendar as tasks or keep as events"""
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        # Get events
        service = build("calendar", "v3", credentials=creds)
        
        now = datetime.utcnow()
        time_min = (now - timedelta(days=request.days_back)).isoformat() + "Z"
        time_max = (now + timedelta(days=request.days_forward)).isoformat() + "Z"
        
        events_result = service.events().list(
            calendarId=request.calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=500
        ).execute()
        
        events = events_result.get("items", [])
        db = get_database()
        user_id = str(current_user["_id"])
        
        imported_count = 0
        imported_items = []
        
        for event in events:
            start = event.get("start", {})
            end = event.get("end", {})
            
            is_all_day = "date" in start
            
            if is_all_day:
                start_dt = datetime.fromisoformat(start["date"])
                due_time = None
            else:
                start_str = start.get("dateTime", "")
                if start_str:
                    start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    due_time = start_dt.strftime("%H:%M")
                else:
                    continue
            
            google_event_id = event.get("id")
            
            # Check if already imported
            existing = db.tasks.find_one({
                "user": user_id,
                "googleEventId": google_event_id
            })
            
            if existing:
                continue
            
            if request.import_as == "tasks":
                # Create as task
                task_doc = {
                    "title": event.get("summary", "Untitled"),
                    "description": event.get("description", ""),
                    "user": user_id,
                    "list": None,
                    "dueDate": start_dt,
                    "dueTime": due_time,
                    "priority": "none",
                    "status": "scheduled",
                    "tags": ["google-calendar"],
                    "subtasks": [],
                    "attachments": [],
                    "order": 0,
                    "createdByAI": False,
                    "googleEventId": google_event_id,
                    "googleCalendarId": request.calendar_id,
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
                
                result = await db.tasks.insert_one(task_doc)
                task_doc["_id"] = str(result.inserted_id)
                imported_items.append(task_doc)
                imported_count += 1
            else:
                # Create as calendar event (stored separately)
                event_doc = {
                    "title": event.get("summary", "Untitled"),
                    "description": event.get("description", ""),
                    "user": user_id,
                    "start": start_dt,
                    "end": datetime.fromisoformat(end.get("dateTime", end.get("date", "")).replace("Z", "+00:00")) if end.get("dateTime") or end.get("date") else None,
                    "allDay": is_all_day,
                    "location": event.get("location"),
                    "googleEventId": google_event_id,
                    "googleCalendarId": request.calendar_id,
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
                
                result = await db.calendar_events.insert_one(event_doc)
                event_doc["_id"] = str(result.inserted_id)
                imported_items.append(event_doc)
                imported_count += 1
        
        return {
            "message": f"Imported {imported_count} items as {request.import_as}",
            "count": imported_count,
            "items": imported_items[:10]  # Return first 10 for preview
        }
        
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import: {str(e)}")


@router.post("/sync")
async def sync_calendar(current_user: dict = Depends(get_current_user)):
    """Sync new events from ALL selected Google Calendars"""
    logger.info(f"[SYNC] Starting sync for user: {current_user.get('email', 'unknown')}")
    
    creds = get_credentials_from_user(current_user)
    if not creds:
        logger.warning(f"[SYNC] No credentials found for user")
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    logger.info(f"[SYNC] Credentials found, access token present: {bool(creds.token)}")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        db = get_database()
        user_id = str(current_user["_id"])
        user_oid = ObjectId(user_id)  # For database operations
        
        # Get selected calendars and their colors
        selected_ids = current_user.get("googleSelectedCalendars", ["primary"])
        logger.info(f"[SYNC] Selected calendars: {selected_ids}")
        
        # Fetch calendar colors
        calendars_result = service.calendarList().list().execute()
        calendars_items = calendars_result.get("items", [])
        calendar_colors = {c['id']: c.get('backgroundColor', '#4772fa') for c in calendars_items}
        
        # Get events from last sync or last 7 days
        last_sync = current_user.get("lastCalendarSync")
        if last_sync:
            # Buffer back 1 hour to ensure nothing missed
            time_min = (last_sync - timedelta(hours=1)).isoformat() + "Z"
            logger.info(f"[SYNC] Using lastCalendarSync: {last_sync}, time_min: {time_min}")
        else:
            time_min = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
            logger.info(f"[SYNC] No lastCalendarSync, using 7 days ago: {time_min}")
            
        time_max = (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z"
        logger.info(f"[SYNC] Time range: {time_min} to {time_max}")
        
        synced_count = 0
        
        # FIRST: Delete events from calendars that are NO LONGER selected
        # Mongita doesn't support $exists, so we fetch and filter manually
        all_tasks = await db.tasks.find({"user": user_oid}).to_list(None)
        deselected_tasks = [
            t for t in all_tasks 
            if t.get("googleCalendarId") and t.get("googleCalendarId") not in selected_ids
        ]
        deleted_count = 0
        for task in deselected_tasks:
            await db.tasks.delete_one({"_id": task["_id"]})
            deleted_count += 1
        if deleted_count > 0:
            logger.info(f"[SYNC] Deleted {deleted_count} events from deselected calendars")
        
        # Iterate over EACH selected calendar
        for cal_id in selected_ids:
            try:
                logger.info(f"[SYNC] Fetching events from calendar: {cal_id}")
                events_result = service.events().list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    orderBy="startTime",
                    maxResults=200
                ).execute()
                
                events = events_result.get("items", [])
                logger.info(f"[SYNC] Found {len(events)} events in calendar {cal_id}")
                cal_color = calendar_colors.get(cal_id, "#4772fa")
                
                for event in events:
                    google_event_id = event.get("id")
                    
                    # Check if exists - use both event ID and calendar ID for uniqueness
                    # (same event ID can appear in different calendars)
                    existing = await db.tasks.find_one({
                        "user": user_oid,
                        "googleEventId": google_event_id,
                        "googleCalendarId": cal_id
                    })
                    
                    if not existing:
                        logger.info(f"[SYNC] Importing new event: {event.get('summary', 'Untitled')}")
                        start = event.get("start", {})
                        is_all_day = "date" in start
                        
                        if is_all_day:
                            start_dt = datetime.fromisoformat(start["date"])
                            due_time = None
                        else:
                            start_str = start.get("dateTime", "")
                            if start_str:
                                # Parse the datetime with timezone awareness
                                # Google Calendar returns times in the calendar's timezone
                                # Format examples: "2026-01-09T14:30:00-07:00" or "2026-01-09T14:30:00Z"
                                if start_str.endswith('Z'):
                                    # UTC timezone
                                    start_dt_utc = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                                    # Convert to local timezone (server timezone)
                                    start_dt = start_dt_utc.astimezone()
                                elif '+' in start_str or (start_str.count('-') > 2 and 'T' in start_str):
                                    # Has timezone offset (e.g., -07:00 or +05:30)
                                    start_dt_tz = datetime.fromisoformat(start_str)
                                    # Convert to local timezone
                                    start_dt = start_dt_tz.astimezone()
                                else:
                                    # No timezone info, assume local timezone
                                    start_dt = datetime.fromisoformat(start_str)
                                
                                # Extract time from the converted datetime (now in local timezone)
                                # This ensures prayer times and other events show correct local time
                                due_time = start_dt.strftime("%H:%M")
                                
                                # Store date part only (local date, midnight)
                                start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                            else:
                                continue
                        
                        task_doc = {
                            "title": event.get("summary", "Untitled"),
                            "description": event.get("description", ""),
                            "user": user_oid,  # Store as ObjectId for consistency
                            "list": None,
                            "dueDate": start_dt,
                            "dueTime": due_time,
                            "priority": "none",
                            "status": "scheduled",
                            "tags": ["google-calendar", "synced"],
                            "subtasks": [],
                            "attachments": [],
                            "order": 0,
                            "googleEventId": google_event_id,
                            "googleCalendarId": cal_id,
                            "googleCalendarColor": cal_color,
                            "createdAt": datetime.now(),
                            "updatedAt": datetime.now()
                        }
                        
                        await db.tasks.insert_one(task_doc)
                        synced_count += 1
                    else:
                        logger.debug(f"[SYNC] Skipping already synced: {event.get('summary', 'Untitled')}")
                        
            except Exception as cal_error:
                logger.error(f"Error syncing calendar {cal_id}: {cal_error}")
                continue
        
        # Update last sync time
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"lastCalendarSync": datetime.utcnow()}}
        )
        
        return {
            "message": f"Synced {synced_count} new events from {len(selected_ids)} calendars",
            "count": synced_count
        }
        
    except Exception as e:
        logger.exception(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


@router.post("/sync/force")
async def force_sync_calendar(current_user: dict = Depends(get_current_user)):
    """Force a full resync by clearing lastCalendarSync timestamp"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    # Clear the last sync time to force full re-import
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {"lastCalendarSync": ""}}
    )
    
    logger.info(f"[SYNC] Force sync requested - cleared lastCalendarSync for user {current_user.get('email', 'unknown')}")
    
    # Now run the actual sync
    return await sync_calendar(current_user)
