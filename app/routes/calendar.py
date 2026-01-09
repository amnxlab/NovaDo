"""
Google Calendar routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId

router = APIRouter()


@router.get("/status", response_model=dict)
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Check Google Calendar connection status"""
    is_connected = bool(
        current_user.get("googleAccessToken") and
        current_user.get("googleRefreshToken")
    )
    
    return {
        "connected": is_connected,
        "email": current_user.get("email") if is_connected else None
    }


@router.post("/import", response_model=dict)
async def import_calendar(current_user: dict = Depends(get_current_user)):
    """Import events from Google Calendar"""
    # Placeholder - full implementation would use Google Calendar API
    if not current_user.get("googleAccessToken"):
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected"
        )
    
    return {
        "message": "Calendar import not fully implemented",
        "count": 0,
        "tasks": []
    }


@router.post("/sync", response_model=dict)
async def sync_calendar(current_user: dict = Depends(get_current_user)):
    """Sync tasks with Google Calendar"""
    # Placeholder - full implementation would sync tasks
    if not current_user.get("googleAccessToken"):
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected"
        )
    
    return {
        "message": "Calendar sync not fully implemented",
        "count": 0
    }

