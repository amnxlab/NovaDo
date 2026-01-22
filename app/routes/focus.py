"""
Focus Session Routes for Pomodoro/Stopwatch tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId

router = APIRouter()


class FocusSessionCreate(BaseModel):
    taskId: Optional[str] = None
    taskTitle: Optional[str] = None
    tags: List[str] = []
    duration: int  # minutes
    startTime: datetime
    endTime: datetime
    type: str = "pomo"  # "pomo" or "stopwatch"


class FocusSessionResponse(BaseModel):
    id: str
    taskId: Optional[str]
    taskTitle: Optional[str]
    tags: List[str]
    duration: int
    startTime: datetime
    endTime: datetime
    type: str
    createdAt: datetime


@router.post("/sessions")
async def create_focus_session(
    session: FocusSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Record a completed focus session"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    session_doc = {
        "user": user_oid,
        "taskId": session.taskId,
        "taskTitle": session.taskTitle,
        "tags": session.tags,
        "duration": session.duration,
        "startTime": session.startTime,
        "endTime": session.endTime,
        "type": session.type,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.focus_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    
    return {
        "message": "Focus session recorded",
        "id": str(result.inserted_id)
    }


@router.get("/sessions")
async def get_focus_sessions(
    limit: int = 50,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get focus session history"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    # Get sessions from the last N days
    since = datetime.utcnow() - timedelta(days=days)
    
    # Mongita doesn't support complex queries, so we fetch all and filter
    all_sessions = await db.focus_sessions.find({"user": user_oid}).to_list(None)
    
    # Filter by date and sort
    sessions = [
        s for s in all_sessions 
        if s.get("createdAt") and s["createdAt"] >= since
    ]
    sessions.sort(key=lambda x: x.get("createdAt", datetime.min), reverse=True)
    sessions = sessions[:limit]
    
    # Group by date for display
    grouped = {}
    for s in sessions:
        date_key = s["createdAt"].strftime("%Y-%m-%d")
        if date_key not in grouped:
            grouped[date_key] = []
        grouped[date_key].append({
            "id": str(s["_id"]),
            "taskId": s.get("taskId"),
            "taskTitle": s.get("taskTitle"),
            "tags": s.get("tags", []),
            "duration": s.get("duration", 0),
            "startTime": s.get("startTime").isoformat() if s.get("startTime") else None,
            "endTime": s.get("endTime").isoformat() if s.get("endTime") else None,
            "type": s.get("type", "pomo"),
            "createdAt": s.get("createdAt").isoformat() if s.get("createdAt") else None
        })
    
    return {"sessions": grouped}


@router.get("/stats")
async def get_focus_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get aggregated focus statistics"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    all_sessions = await db.focus_sessions.find({"user": user_oid}).to_list(None)
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate stats
    today_sessions = [s for s in all_sessions if s.get("createdAt") and s["createdAt"] >= today]
    today_pomos = len([s for s in today_sessions if s.get("type") == "pomo"])
    today_duration = sum(s.get("duration", 0) for s in today_sessions)
    
    total_pomos = len([s for s in all_sessions if s.get("type") == "pomo"])
    total_duration = sum(s.get("duration", 0) for s in all_sessions)
    
    # Stats by tag
    tag_stats = {}
    for s in all_sessions:
        for tag in s.get("tags", []):
            if tag not in tag_stats:
                tag_stats[tag] = {"count": 0, "duration": 0}
            tag_stats[tag]["count"] += 1
            tag_stats[tag]["duration"] += s.get("duration", 0)
    
    # Sort tags by duration
    sorted_tags = sorted(tag_stats.items(), key=lambda x: x[1]["duration"], reverse=True)
    
    return {
        "today": {
            "pomos": today_pomos,
            "duration": today_duration
        },
        "total": {
            "pomos": total_pomos,
            "duration": total_duration
        },
        "byTag": [
            {"tag": tag, "count": stats["count"], "duration": stats["duration"]}
            for tag, stats in sorted_tags[:10]
        ]
    }


@router.delete("/sessions/{session_id}")
async def delete_focus_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a focus session"""
    db = get_database()
    user_oid = ObjectId(current_user["_id"])
    
    result = await db.focus_sessions.delete_one({
        "_id": ObjectId(session_id),
        "user": user_oid
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session deleted"}
