"""
Habit routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from app.models import HabitCreate, HabitComplete
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta


def validate_object_id(id_str: str, field_name: str = "ID") -> ObjectId:
    """Validate and convert string to ObjectId, raising HTTPException on invalid format"""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")


router = APIRouter()


@router.get("/", response_model=dict)
async def get_habits(
    isActive: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all habits"""
    db = get_database()
    
    query = {
        "user": ObjectId(current_user["_id"]),
        "isArchived": False
    }
    
    if isActive is not None:
        query["isActive"] = isActive
    
    habits = await db.habits.find(query).sort("createdAt", -1).to_list(None)
    
    for habit in habits:
        habit["_id"] = str(habit["_id"])
        habit["user"] = str(habit["user"])
    
    return {"habits": habits}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_habit(habit_data: HabitCreate, current_user: dict = Depends(get_current_user)):
    """Create a new habit"""
    db = get_database()
    
    habit_doc = {
        "name": habit_data.name,
        "description": habit_data.description or "",
        "user": ObjectId(current_user["_id"]),
        "frequency": habit_data.frequency,
        "targetDays": habit_data.targetDays,
        "targetCount": habit_data.targetCount,
        "completions": [],
        "currentStreak": 0,
        "longestStreak": 0,
        "color": habit_data.color,
        "icon": habit_data.icon,
        "reminder": habit_data.reminder or {"enabled": False},
        "isActive": True,
        "isArchived": False,
        "startDate": datetime.now()
    }
    
    result = await db.habits.insert_one(habit_doc)
    habit_id = result.inserted_id
    
    habit_doc["_id"] = str(habit_id)
    habit_doc["user"] = str(habit_doc["user"])
    
    return {"habit": habit_doc}


@router.post("/{habit_id}/complete", response_model=dict)
async def complete_habit(
    habit_id: str,
    completion_data: HabitComplete,
    current_user: dict = Depends(get_current_user)
):
    """Mark habit as completed"""
    db = get_database()
    habit_oid = validate_object_id(habit_id, "habit ID")
    
    habit = await db.habits.find_one({
        "_id": habit_oid,
        "user": ObjectId(current_user["_id"])
    })
    
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    completion_date = completion_data.date or datetime.now()
    completion_date = completion_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check if already completed for this date
    completions = habit.get("completions", [])
    existing_index = None
    for i, comp in enumerate(completions):
        comp_date = comp["date"].replace(hour=0, minute=0, second=0, microsecond=0)
        if comp_date == completion_date:
            existing_index = i
            break
    
    if existing_index is not None:
        completions[existing_index]["count"] += completion_data.count
        if completion_data.note:
            completions[existing_index]["note"] = completion_data.note
    else:
        completions.append({
            "date": completion_date,
            "count": completion_data.count,
            "note": completion_data.note
        })
    
    # Update streak (check from today, but if today not completed, check from yesterday)
    sorted_completions = sorted(completions, key=lambda x: x["date"], reverse=True)
    streak = 0
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    # Check if today is completed
    today_completed = any(
        comp["date"].replace(hour=0, minute=0, second=0, microsecond=0) == today 
        for comp in sorted_completions
    )
    
    # Start checking from today if completed today, otherwise from yesterday
    start_date = today if today_completed else yesterday
    
    for i, comp in enumerate(sorted_completions):
        comp_date = comp["date"].replace(hour=0, minute=0, second=0, microsecond=0)
        expected_date = (start_date - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        if comp_date == expected_date:
            streak += 1
        else:
            break
    
    longest_streak = max(habit.get("longestStreak", 0), streak)
    
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": {
            "completions": completions,
            "currentStreak": streak,
            "longestStreak": longest_streak
        }}
    )
    
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    updated_habit["_id"] = str(updated_habit["_id"])
    updated_habit["user"] = str(updated_habit["user"])
    
    return {"habit": updated_habit}


@router.delete("/{habit_id}", response_model=dict)
async def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a habit"""
    db = get_database()
    habit_oid = validate_object_id(habit_id, "habit ID")
    
    result = await db.habits.delete_one({
        "_id": habit_oid,
        "user": ObjectId(current_user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return {"message": "Habit deleted successfully"}

