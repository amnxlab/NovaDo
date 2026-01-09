"""
Pomodoro Timer Routes
Handles pomodoro session tracking
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from bson import ObjectId

from app.auth import get_current_user
from app.database import get_database

router = APIRouter()


class PomodoroSession(BaseModel):
    taskId: Optional[str] = None
    duration: int = 25
    completedAt: Optional[str] = None


class PomodoroSessionResponse(BaseModel):
    id: str
    taskId: Optional[str]
    duration: int
    completedAt: str
    userId: str


@router.post("/", response_model=dict)
async def create_session(
    session: PomodoroSession,
    current_user: dict = Depends(get_current_user)
):
    """Save a completed pomodoro session"""
    db = get_database()
    
    session_data = {
        "userId": current_user["_id"],
        "taskId": session.taskId,
        "duration": session.duration,
        "completedAt": session.completedAt or datetime.utcnow().isoformat(),
        "createdAt": datetime.utcnow()
    }
    
    result = await db.pomodoro_sessions.insert_one(session_data)
    
    return {
        "success": True,
        "session": {
            "id": str(result.inserted_id),
            **session_data,
            "userId": str(session_data["userId"])
        }
    }


@router.get("/", response_model=dict)
async def get_sessions(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get pomodoro sessions, optionally filtered by date"""
    db = get_database()
    
    query = {"userId": current_user["_id"]}
    
    if date:
        # Filter by date (YYYY-MM-DD format)
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            next_date = target_date.replace(hour=23, minute=59, second=59)
            query["completedAt"] = {
                "$gte": target_date.isoformat(),
                "$lte": next_date.isoformat()
            }
        except ValueError:
            pass
    
    sessions = await db.pomodoro_sessions.find(query).sort("completedAt", -1).to_list(100)
    
    return {
        "sessions": [
            {
                "id": str(s["_id"]),
                "taskId": s.get("taskId"),
                "duration": s.get("duration", 25),
                "completedAt": s.get("completedAt")
            }
            for s in sessions
        ]
    }


@router.get("/stats", response_model=dict)
async def get_pomodoro_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get pomodoro statistics"""
    db = get_database()
    
    # Today's sessions
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = await db.pomodoro_sessions.count_documents({
        "userId": current_user["_id"],
        "completedAt": {"$gte": today.isoformat()}
    })
    
    # Total sessions
    total_sessions = await db.pomodoro_sessions.count_documents({
        "userId": current_user["_id"]
    })
    
    # Total focus time (in minutes)
    pipeline = [
        {"$match": {"userId": current_user["_id"]}},
        {"$group": {"_id": None, "totalMinutes": {"$sum": "$duration"}}}
    ]
    result = await db.pomodoro_sessions.aggregate(pipeline).to_list(1)
    total_minutes = result[0]["totalMinutes"] if result else 0
    
    return {
        "todaySessions": today_sessions,
        "totalSessions": total_sessions,
        "totalFocusTime": total_minutes
    }

