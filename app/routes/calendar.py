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

# Google OAuth imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest

router = APIRouter()

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/api/calendar/callback")

# OAuth scopes for Google Calendar
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
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
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return None
    
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
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
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
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


@router.get("/config")
async def get_calendar_config():
    """Get Google Calendar configuration status"""
    is_configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    return {
        "configured": is_configured,
        "message": "Google Calendar is configured" if is_configured else "Google Calendar credentials not set. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file."
    }


@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Check Google Calendar connection status"""
    is_connected = bool(
        current_user.get("googleAccessToken") and
        current_user.get("googleRefreshToken")
    )
    
    google_email = current_user.get("googleEmail")
    
    return {
        "connected": is_connected,
        "email": google_email if is_connected else None,
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    }


@router.get("/auth")
async def start_google_auth(current_user: dict = Depends(get_current_user)):
    """Start Google OAuth flow - returns authorization URL"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
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
    
    # Store state with user ID for callback
    user_id = str(current_user.get("_id"))
    oauth_states[state] = {
        "user_id": user_id,
        "created_at": datetime.now()
    }
    
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
    
    # Verify state
    state_data = oauth_states.get(state)
    if not state_data:
        return RedirectResponse(
            url="/?google_auth=error&message=Invalid state parameter",
            status_code=302
        )
    
    user_id = state_data["user_id"]
    del oauth_states[state]  # Clean up state
    
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
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "googleAccessToken": credentials.token,
                "googleRefreshToken": credentials.refresh_token,
                "googleEmail": user_info.get("email"),
                "googleConnectedAt": datetime.now()
            }}
        )
        
        # Automatically import calendar events as tasks
        try:
            calendar_service = build("calendar", "v3", credentials=credentials)
            
            # Get events from last 30 days and next 90 days
            now = datetime.utcnow()
            time_min = (now - timedelta(days=30)).isoformat() + "Z"
            time_max = (now + timedelta(days=90)).isoformat() + "Z"
            
            events_result = calendar_service.events().list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
                maxResults=500
            ).execute()
            
            events = events_result.get("items", [])
            imported_count = 0
            
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
                    "googleCalendarId": "primary",
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
                
                db.tasks.insert_one(task_doc)
                imported_count += 1
            
            # Update last sync time
            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"lastCalendarSync": datetime.utcnow()}}
            )
            
            return RedirectResponse(
                url=f"/?google_auth=success&imported={imported_count}",
                status_code=302
            )
        except Exception as import_error:
            print(f"Auto-import error (connection still saved): {import_error}")
            # Still return success - connection is saved, import can be retried
            return RedirectResponse(
                url="/?google_auth=success&imported=0",
                status_code=302
            )
        
    except Exception as e:
        print(f"Google auth callback error: {e}")
        return RedirectResponse(
            url=f"/?google_auth=error&message=Authentication failed",
            status_code=302
        )


@router.post("/disconnect")
async def disconnect_google(current_user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar"""
    db = get_database()
    
    db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$unset": {
            "googleAccessToken": "",
            "googleRefreshToken": "",
            "googleEmail": "",
            "googleConnectedAt": ""
        }}
    )
    
    return {"message": "Google Calendar disconnected"}


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
        
        return {
            "calendars": [
                {
                    "id": cal["id"],
                    "name": cal["summary"],
                    "primary": cal.get("primary", False),
                    "color": cal.get("backgroundColor", "#4772fa")
                }
                for cal in calendars
            ]
        }
    except Exception as e:
        print(f"List calendars error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list calendars: {str(e)}")


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
                
                result = db.tasks.insert_one(task_doc)
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
                
                result = db.calendar_events.insert_one(event_doc)
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
    """Sync new events from Google Calendar"""
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        service = build("calendar", "v3", credentials=creds)
        db = get_database()
        user_id = str(current_user["_id"])
        
        # Get events from last sync or last 7 days
        last_sync = current_user.get("lastCalendarSync")
        if last_sync:
            time_min = last_sync.isoformat() + "Z"
        else:
            time_min = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
        
        time_max = (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z"
        
        events_result = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=100
        ).execute()
        
        events = events_result.get("items", [])
        synced_count = 0
        
        for event in events:
            google_event_id = event.get("id")
            
            # Check if exists
            existing = db.tasks.find_one({
                "user": user_id,
                "googleEventId": google_event_id
            })
            
            if not existing:
                start = event.get("start", {})
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
                
                task_doc = {
                    "title": event.get("summary", "Untitled"),
                    "description": event.get("description", ""),
                    "user": user_id,
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
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
                
                db.tasks.insert_one(task_doc)
                synced_count += 1
        
        # Update last sync time
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"lastCalendarSync": datetime.utcnow()}}
        )
        
        return {
            "message": f"Synced {synced_count} new events",
            "count": synced_count
        }
        
    except Exception as e:
        print(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")
