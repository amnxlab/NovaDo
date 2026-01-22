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
import pytz
from dotenv import load_dotenv
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)


def safe_print(text):
    """
    Safely print text with Unicode characters on Windows.
    Falls back to encoding-safe version if console doesn't support UTF-8.
    """
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback: encode as UTF-8 then decode with 'replace' error handling
        safe_text = text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        print(safe_text)

# Ensure .env is loaded from the correct location (especially for PyInstaller builds)
if getattr(sys, 'frozen', False):
    _work_dir = Path(os.path.dirname(sys.executable))
else:
    _work_dir = Path(__file__).parent.parent.parent

_env_path = _work_dir / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
    logger.info(f"[Calendar] Loaded .env from: {_env_path}")
else:
    load_dotenv()

# Allow OAuth scope changes (Google sometimes returns additional scopes)
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

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
# Note: calendar.events includes both read AND write permissions
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",  # Full read/write access to events
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


def convert_event_time_to_user_tz(time_str: str, user_preferences: dict) -> tuple:
    """
    Convert calendar event time to user's timezone.
    
    Handles various time formats from calendar sources:
    - UTC times ending with 'Z' (e.g., "2026-01-09T14:30:00Z")
    - Times with timezone offset (e.g., "2026-01-09T14:30:00-07:00")
    - Local times without timezone info (e.g., PrayerCal's "2026-01-09T14:30:00")
    
    Args:
        time_str: The datetime string from the calendar
        user_preferences: User's preferences dict containing timezone setting
        
    Returns:
        Tuple of (date_only: datetime, time_str: str)
        - date_only: datetime with date part only (midnight, no timezone)
        - time_str: formatted time string "HH:MM" in user's timezone
    """
    # Get user's configured timezone (default to UTC if not set)
    user_tz_str = user_preferences.get("timezone", "UTC")
    try:
        user_tz = pytz.timezone(user_tz_str)
    except pytz.UnknownTimeZoneError:
        logger.warning(f"[TZ] Unknown timezone '{user_tz_str}', falling back to UTC")
        user_tz = pytz.UTC
    
    # Parse the datetime string
    if time_str.endswith('Z'):
        # UTC timezone (e.g., "2026-01-09T14:30:00Z")
        dt_utc = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    elif '+' in time_str or (time_str.count('-') > 2 and 'T' in time_str):
        # Has timezone offset (e.g., "-07:00" or "+05:30")
        dt_utc = datetime.fromisoformat(time_str)
    else:
        # No timezone info - this is the PrayerCal case
        # Treat as LOCAL time in user's timezone, not UTC
        naive_dt = datetime.fromisoformat(time_str)
        # Localize to user's timezone (it's already in their local time)
        dt_utc = user_tz.localize(naive_dt)
        logger.debug(f"[TZ] No timezone in '{time_str}', treating as user's local time ({user_tz_str})")
    
    # Convert to user's timezone
    dt_user = dt_utc.astimezone(user_tz)
    logger.debug(f"[TZ] Converted {time_str} -> {dt_user} (user tz: {user_tz_str})")
    
    # Extract time string
    time_result = dt_user.strftime("%H:%M")
    
    # Store date part only (user's local date, midnight, no timezone)
    date_only = dt_user.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    return (date_only, time_result)


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
            # Update tokens in database (note: this runs in sync context, use sync update)
            # Since get_credentials_from_user is called from sync context in some places,
            # we need to handle this carefully - token refresh is synchronous but DB update needs async
            import asyncio
            db = get_database()
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're in async context, schedule the update
                    asyncio.create_task(db.users.update_one(
                        {"_id": ObjectId(user["_id"])},
                        {"$set": {
                            "googleAccessToken": creds.token,
                            "googleRefreshToken": creds.refresh_token
                        }}
                    ))
                else:
                    loop.run_until_complete(db.users.update_one(
                        {"_id": ObjectId(user["_id"])},
                        {"$set": {
                            "googleAccessToken": creds.token,
                            "googleRefreshToken": creds.refresh_token
                        }}
                    ))
            except RuntimeError:
                # No event loop, we'll skip the update - next call will refresh again
                logger.warning("Could not update refreshed token - no event loop")
        except Exception as e:
            # Token refresh failed (expired, revoked, or invalid)
            logger.warning(f"Failed to refresh Google token: {e}")
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
    
    # Check if token is actually valid by trying to get credentials
    is_connected = has_access
    token_expired = False
    
    if has_access:
        creds = get_credentials_from_user(current_user)
        if creds is None and has_refresh:
            # Token refresh failed - likely expired or revoked
            token_expired = True
            is_connected = False
    
    google_email = current_user.get("googleEmail")
    
    return {
        "connected": is_connected,
        "email": google_email if is_connected else None,
        "configured": bool(get_google_client_id() and get_google_client_secret()),
        "token_expired": token_expired,
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
        # Note: OAUTHLIB_RELAX_TOKEN_SCOPE is set at module level to handle scope changes
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
        
        # Get selected calendars from user profile (ensure it's always a list)
        selected_ids = current_user.get("googleSelectedCalendars")
        if selected_ids is None or not isinstance(selected_ids, list):
            selected_ids = ["primary"]
        
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
        safe_print(f"List calendars error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list calendars: {str(e)}")


@router.post("/calendars/select")
async def select_calendars(
    selection: CalendarSelection,
    current_user: dict = Depends(get_current_user)
):
    """Update selected Google Calendars and remove events from deselected calendars"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Get previously selected calendars (handle None case explicitly)
    previously_selected = current_user.get("googleSelectedCalendars") or ["primary"]
    newly_selected = selection.calendar_ids
    
    # Find calendars that were deselected
    deselected_calendars = set(previously_selected) - set(newly_selected)
    
    # Delete events from deselected calendars immediately
    deleted_count = 0
    if deselected_calendars:
        all_tasks = await db.tasks.find({"user": user_oid}).to_list(None)
        for task in all_tasks:
            if task.get("googleCalendarId") in deselected_calendars:
                await db.tasks.delete_one({"_id": task["_id"]})
                deleted_count += 1
        if deleted_count > 0:
            logger.info(f"[SELECT] Deleted {deleted_count} events from deselected calendars: {deselected_calendars}")
    
    # Update selected calendars
    await db.users.update_one(
        {"_id": user_oid},
        {"$set": {"googleSelectedCalendars": newly_selected}}
    )
    
    return {
        "message": "Calendar selection updated", 
        "selected": newly_selected,
        "eventsDeleted": deleted_count
    }


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
                user_preferences = current_user.get("preferences", {})
                # For events display, we need full datetime, not just date
                if start_str:
                    start_dt, _ = convert_event_time_to_user_tz(start_str, user_preferences)
                    # Reconstruct full datetime by parsing again with user tz context
                    user_tz_str = user_preferences.get("timezone", "UTC")
                    try:
                        user_tz = pytz.timezone(user_tz_str)
                    except pytz.UnknownTimeZoneError:
                        user_tz = pytz.UTC
                    # For events endpoint, return the converted datetime
                    if start_str.endswith('Z'):
                        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00")).astimezone(user_tz)
                    elif '+' in start_str or (start_str.count('-') > 2 and 'T' in start_str):
                        start_dt = datetime.fromisoformat(start_str).astimezone(user_tz)
                    else:
                        start_dt = user_tz.localize(datetime.fromisoformat(start_str))
                else:
                    start_dt = None
                if end_str:
                    if end_str.endswith('Z'):
                        end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00")).astimezone(user_tz)
                    elif '+' in end_str or (end_str.count('-') > 2 and 'T' in end_str):
                        end_dt = datetime.fromisoformat(end_str).astimezone(user_tz)
                    else:
                        end_dt = user_tz.localize(datetime.fromisoformat(end_str))
                else:
                    end_dt = None
            
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
        safe_print(f"Get events error: {e}")
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
                    user_preferences = current_user.get("preferences", {})
                    start_dt, due_time = convert_event_time_to_user_tz(start_str, user_preferences)
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
        safe_print(f"Import error: {e}")
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
        
        # Get selected calendars and their colors (handle None explicitly)
        selected_ids = current_user.get("googleSelectedCalendars") or ["primary"]
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
        all_tasks = all_tasks or []  # Handle None case
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
                                # Use shared helper for timezone conversion
                                user_preferences = current_user.get("preferences", {})
                                start_dt, due_time = convert_event_time_to_user_tz(start_str, user_preferences)
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


# ============================================================================
# BIDIRECTIONAL SYNC: Push NovaDo Tasks to Google Calendar
# ============================================================================

class PushTaskRequest(BaseModel):
    """Request model for pushing a task to Google Calendar"""
    calendar_id: str = "primary"
    include_reminder: bool = True


def build_google_calendar_event(task: dict, user_preferences: dict) -> dict:
    """
    Convert a NovaDo task to a Google Calendar event format.
    
    Args:
        task: The task document from database
        user_preferences: User's preferences for timezone
        
    Returns:
        Google Calendar event object ready for API call
    """
    # Get user timezone
    user_tz_str = user_preferences.get("timezone", "UTC")
    
    # Build event summary and description
    summary = task.get("title", "Untitled Task")
    description = task.get("description", "")
    
    # Add NovaDo metadata to description
    if description:
        description += "\n\n---\n"
    description += f"📋 Created in NovaDo\n"
    if task.get("priority") and task["priority"] != "none":
        priority_icons = {"low": "🟢", "medium": "🟡", "high": "🔴"}
        description += f"Priority: {priority_icons.get(task['priority'], '')} {task['priority'].title()}\n"
    if task.get("tags"):
        description += f"Tags: {', '.join(task['tags'])}\n"
    
    # Build start/end times
    due_date = task.get("dueDate")
    due_time = task.get("dueTime")
    
    if not due_date:
        raise ValueError("Task must have a dueDate to sync to calendar")
    
    # Check if this is an all-day event (no specific time)
    is_all_day = not due_time
    
    event = {
        "summary": summary,
        "description": description,
    }
    
    if is_all_day:
        # All-day event uses 'date' format
        if isinstance(due_date, datetime):
            date_str = due_date.strftime("%Y-%m-%d")
        else:
            date_str = str(due_date)[:10]  # Extract YYYY-MM-DD
        event["start"] = {"date": date_str}
        event["end"] = {"date": date_str}
    else:
        # Timed event uses 'dateTime' format
        # Important: Create datetime in user's timezone to avoid date/time shifts
        from datetime import date as date_type
        
        # Get user's timezone
        try:
            user_tz = pytz.timezone(user_tz_str)
        except:
            user_tz = pytz.UTC
        
        # Extract date components
        if isinstance(due_date, datetime):
            date_obj = due_date.date()
        elif isinstance(due_date, date_type):
            date_obj = due_date
        else:
            # Parse from string
            date_str = str(due_date)[:10]
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Parse time
        if due_time:
            hours, minutes = map(int, due_time.split(":"))
        else:
            hours, minutes = 12, 0  # Default to noon
        
        # Create naive datetime with the exact date and time user specified
        naive_dt = datetime(date_obj.year, date_obj.month, date_obj.day, hours, minutes, 0)
        
        # Localize to user's timezone (make it timezone-aware)
        start_dt = user_tz.localize(naive_dt)
        
        # Log for debugging
        logger.debug(
            f"[CALENDAR EVENT] Task: {summary} | "
            f"Date: {date_obj} | Time: {hours:02d}:{minutes:02d} | "
            f"Timezone: {user_tz_str} | "
            f"Result: {start_dt.isoformat()}"
        )
        
        # Default duration: 1 hour
        end_dt = start_dt + timedelta(hours=1)
        
        # Format for Google Calendar API
        event["start"] = {
            "dateTime": start_dt.isoformat(),
            "timeZone": user_tz_str
        }
        event["end"] = {
            "dateTime": end_dt.isoformat(),
            "timeZone": user_tz_str
        }
    
    # Add reminder if task has reminder settings
    reminder = task.get("reminder", {})
    if reminder.get("enabled") and reminder.get("notifyMobile", True):
        minutes_before = reminder.get("minutesBefore", 30)
        event["reminders"] = {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": minutes_before}
            ]
        }
    
    # Add colorId based on priority
    priority_colors = {
        "high": "11",      # Red
        "medium": "5",     # Yellow
        "low": "10",       # Green
        "none": "7"        # Blue (default)
    }
    event["colorId"] = priority_colors.get(task.get("priority", "none"), "7")
    
    return event


@router.post("/push/{task_id}")
async def push_task_to_calendar(
    task_id: str,
    request: PushTaskRequest = PushTaskRequest(),
    current_user: dict = Depends(get_current_user)
):
    """
    Push a NovaDo task to Google Calendar as an event.
    
    If the task already has a googleEventId, updates the existing event.
    Otherwise, creates a new event and stores the ID in the task.
    """
    logger.info(f"[PUSH] Pushing task {task_id} to calendar {request.calendar_id}")
    
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Fetch the task
    try:
        task_oid = ObjectId(task_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid task ID")
    
    task = await db.tasks.find_one({"_id": task_oid, "user": user_oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if not task.get("dueDate"):
        raise HTTPException(status_code=400, detail="Task must have a due date to sync to calendar")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        user_preferences = current_user.get("preferences", {})
        
        # Build the event object
        event_body = build_google_calendar_event(task, user_preferences)
        
        existing_event_id = task.get("googleEventId")
        
        if existing_event_id:
            # Update existing event
            logger.info(f"[PUSH] Updating existing event {existing_event_id}")
            event = service.events().update(
                calendarId=request.calendar_id,
                eventId=existing_event_id,
                body=event_body
            ).execute()
        else:
            # Create new event
            logger.info(f"[PUSH] Creating new event for task {task_id}")
            event = service.events().insert(
                calendarId=request.calendar_id,
                body=event_body
            ).execute()
        
        # Update task with Google Calendar info
        await db.tasks.update_one(
            {"_id": task_oid},
            {"$set": {
                "googleEventId": event["id"],
                "googleCalendarId": request.calendar_id,
                "syncedWithGoogle": True,
                "lastSyncedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }}
        )
        
        logger.info(f"[PUSH] Successfully pushed task {task_id} as event {event['id']}")
        
        return {
            "success": True,
            "message": "Task synced to Google Calendar",
            "eventId": event["id"],
            "eventLink": event.get("htmlLink")
        }
        
    except Exception as e:
        logger.exception(f"[PUSH] Error pushing task to calendar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to push to calendar: {str(e)}")


@router.put("/event/{event_id}")
async def update_calendar_event(
    event_id: str,
    calendar_id: str = "primary",
    current_user: dict = Depends(get_current_user)
):
    """
    Update a Google Calendar event from its linked NovaDo task.
    
    This is called when a task is updated and needs to sync changes to calendar.
    """
    logger.info(f"[UPDATE] Updating calendar event {event_id}")
    
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Find the task linked to this event
    task = await db.tasks.find_one({
        "user": user_oid,
        "googleEventId": event_id
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="No task found linked to this event")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        user_preferences = current_user.get("preferences", {})
        
        # Build updated event body
        event_body = build_google_calendar_event(task, user_preferences)
        
        # Update the event
        event = service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=event_body
        ).execute()
        
        # Update task sync timestamp
        await db.tasks.update_one(
            {"_id": task["_id"]},
            {"$set": {
                "lastSyncedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }}
        )
        
        return {
            "success": True,
            "message": "Calendar event updated",
            "eventId": event["id"]
        }
        
    except Exception as e:
        logger.exception(f"[UPDATE] Error updating calendar event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update event: {str(e)}")


@router.delete("/event/{event_id}")
async def delete_calendar_event(
    event_id: str,
    calendar_id: str = "primary",
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an event from Google Calendar.
    
    Called when a synced task is deleted from NovaDo.
    """
    logger.info(f"[DELETE] Deleting calendar event {event_id}")
    
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        
        # Delete the event
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
        
        logger.info(f"[DELETE] Successfully deleted event {event_id}")
        
        return {
            "success": True,
            "message": "Calendar event deleted"
        }
        
    except Exception as e:
        # If event doesn't exist, that's fine
        if "404" in str(e):
            return {
                "success": True,
                "message": "Event already deleted or not found"
            }
        logger.exception(f"[DELETE] Error deleting calendar event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")


@router.post("/sync/push-all")
async def push_all_tasks_to_calendar(
    calendar_id: str = "primary",
    current_user: dict = Depends(get_current_user)
):
    """
    Push all eligible tasks to Google Calendar.
    
    Only pushes tasks that:
    - Have a dueDate
    - Are not already synced (no googleEventId)
    - Have syncEnabled = True (if set)
    """
    logger.info(f"[PUSH-ALL] Pushing all tasks to calendar for user {current_user.get('email')}")
    
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Find all tasks with dueDate that are not yet synced
    all_tasks = await db.tasks.find({"user": user_oid}).to_list(None)
    eligible_tasks = [
        t for t in all_tasks
        if t.get("dueDate") 
        and not t.get("googleEventId")
        and t.get("status") not in ["completed", "deleted", "skipped"]
    ]
    
    logger.info(f"[PUSH-ALL] Found {len(eligible_tasks)} eligible tasks to push")
    
    pushed_count = 0
    errors = []
    
    try:
        service = build("calendar", "v3", credentials=creds)
        user_preferences = current_user.get("preferences", {})
        
        for task in eligible_tasks:
            try:
                event_body = build_google_calendar_event(task, user_preferences)
                event = service.events().insert(
                    calendarId=calendar_id,
                    body=event_body
                ).execute()
                
                # Update task with Google Calendar info
                await db.tasks.update_one(
                    {"_id": task["_id"]},
                    {"$set": {
                        "googleEventId": event["id"],
                        "googleCalendarId": calendar_id,
                        "syncedWithGoogle": True,
                        "lastSyncedAt": datetime.utcnow()
                    }}
                )
                pushed_count += 1
                
            except Exception as task_error:
                errors.append({
                    "taskId": str(task["_id"]),
                    "title": task.get("title"),
                    "error": str(task_error)
                })
        
        return {
            "success": True,
            "message": f"Pushed {pushed_count} tasks to Google Calendar",
            "pushedCount": pushed_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.exception(f"[PUSH-ALL] Error pushing tasks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to push tasks: {str(e)}")


@router.post("/sync/bidirectional")
async def trigger_bidirectional_sync(current_user: dict = Depends(get_current_user)):
    """
    Trigger an immediate bidirectional sync for the current user.
    
    This pulls changes from Google Calendar and pushes local changes back.
    Can be called manually via the sync button/keyboard shortcut.
    """
    logger.info(f"[SYNC] Manual bidirectional sync triggered by {current_user.get('email')}")
    
    # Check if user has Google Calendar connected
    if not current_user.get("googleAccessToken"):
        raise HTTPException(
            status_code=400, 
            detail="Google Calendar not connected. Please connect in Settings first."
        )
    
    try:
        from app.scheduler import trigger_sync_now
        from app.database import get_database
        
        # Get current task counts before sync
        db = get_database()
        user_tasks = await db.tasks.find({"user": ObjectId(current_user["_id"])}).to_list(None)
        tasks_with_sync = [t for t in user_tasks if t.get("syncToCalendar") and t.get("dueDate")]
        tasks_synced = [t for t in tasks_with_sync if t.get("googleEventId")]
        
        safe_print(f"\n[SYNC DEBUG]")
        safe_print(f"  Total tasks with sync enabled: {len(tasks_with_sync)}")
        safe_print(f"  Already have Google Event ID: {len(tasks_synced)}")
        safe_print(f"  Need to be created: {len(tasks_with_sync) - len(tasks_synced)}")
        
        # Sync only this user
        result = await trigger_sync_now(user=current_user)
        
        if result:
            logger.info(f"[SYNC] Bidirectional sync completed for {current_user.get('email')}")
            
            message = f"Calendar sync completed! {len(tasks_synced)} tasks are synced to Google Calendar."
            if len(tasks_with_sync) == 0:
                message = "Sync completed. Tip: Enable 'Sync to Google Calendar' on tasks to push them to your calendar."
            
            return {
                "success": True,
                "message": message,
                "tasks_synced": len(tasks_synced),
                "total_sync_enabled": len(tasks_with_sync)
            }
        else:
            logger.warning(f"[SYNC] Sync failed for {current_user.get('email')}")
            return {
                "success": False,
                "message": "Sync failed. Please check your Google Calendar connection."
            }
            
    except Exception as e:
        logger.exception(f"[SYNC] Manual sync error for {current_user.get('email')}: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/synced-tasks")
async def get_synced_tasks(current_user: dict = Depends(get_current_user)):
    """Get list of tasks synced to Google Calendar with their event links"""
    from app.database import get_database
    
    db = get_database()
    tasks = await db.tasks.find({
        "user": ObjectId(current_user["_id"]),
        "googleEventId": {"$ne": None}
    }).to_list(None)
    
    synced_tasks = []
    for task in tasks:
        event_id = task.get("googleEventId")
        calendar_id = task.get("googleCalendarId", "primary")
        
        synced_tasks.append({
            "id": str(task["_id"]),
            "title": task.get("title"),
            "dueDate": task.get("dueDate").isoformat() if task.get("dueDate") else None,
            "dueTime": task.get("dueTime"),
            "googleEventId": event_id,
            "googleCalendarId": calendar_id,
            "eventUrl": f"https://calendar.google.com/calendar/event?eid={event_id}&ctz=UTC",
            "lastSyncedAt": task.get("lastSyncedAt").isoformat() if task.get("lastSyncedAt") else None
        })
    
    return {
        "count": len(synced_tasks),
        "tasks": synced_tasks
    }
