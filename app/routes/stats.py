"""
Statistics Routes
Handles productivity statistics and analytics
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from collections import defaultdict

from app.auth import get_current_user
from app.database import get_database

router = APIRouter()


@router.get("/", response_model=dict)
async def get_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive productivity statistics"""
    db = get_database()
    user_id = current_user["_id"]
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    
    # Get all user's tasks
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)
    
    # Completed today
    completed_today = 0
    for task in tasks:
        if task.get("status") == "completed" and task.get("completedAt"):
            try:
                completed_date = datetime.fromisoformat(task["completedAt"].replace("Z", "+00:00"))
                if completed_date.date() == today.date():
                    completed_today += 1
            except:
                pass
    
    # Completed this week
    completed_week = 0
    for task in tasks:
        if task.get("status") == "completed" and task.get("completedAt"):
            try:
                completed_date = datetime.fromisoformat(task["completedAt"].replace("Z", "+00:00"))
                if completed_date >= week_start:
                    completed_week += 1
            except:
                pass
    
    # Calculate streak
    streak = await calculate_streak(db, user_id)
    
    # Today's pomodoro sessions
    pomodoro_sessions = await db.pomodoro_sessions.count_documents({
        "userId": user_id,
        "completedAt": {"$gte": today.isoformat()}
    }) if hasattr(db, 'pomodoro_sessions') else 0
    
    # Weekly data for chart
    weekly_data = await get_weekly_data(db, user_id)
    
    return {
        "completedToday": completed_today,
        "completedWeek": completed_week,
        "streak": streak,
        "pomodoros": pomodoro_sessions,
        "weeklyData": weekly_data,
        "totalTasks": len(tasks),
        "completedTasks": len([t for t in tasks if t.get("status") == "completed"]),
        "pendingTasks": len([t for t in tasks if t.get("status") != "completed"])
    }


async def calculate_streak(db, user_id) -> int:
    """Calculate the current streak of days with completed tasks"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    tasks = await db.tasks.find({
        "user_id": user_id,
        "status": "completed"
    }).to_list(1000)
    
    # Group completions by date
    completion_dates = set()
    for task in tasks:
        if task.get("completedAt"):
            try:
                completed_date = datetime.fromisoformat(task["completedAt"].replace("Z", "+00:00"))
                completion_dates.add(completed_date.date())
            except:
                pass
    
    if not completion_dates:
        return 0
    
    # Count consecutive days
    streak = 0
    check_date = today.date()
    
    while check_date in completion_dates:
        streak += 1
        check_date = check_date - timedelta(days=1)
        if streak > 365:  # Safety limit
            break
    
    return streak


async def get_weekly_data(db, user_id) -> list:
    """Get completion counts for the last 7 days"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    tasks = await db.tasks.find({
        "user_id": user_id,
        "status": "completed"
    }).to_list(1000)
    
    # Count completions by date
    daily_counts = defaultdict(int)
    for task in tasks:
        if task.get("completedAt"):
            try:
                completed_date = datetime.fromisoformat(task["completedAt"].replace("Z", "+00:00"))
                daily_counts[completed_date.date()] += 1
            except:
                pass
    
    # Build last 7 days data
    data = []
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        day_name = date.strftime("%a")
        count = daily_counts.get(date.date(), 0)
        data.append({
            "day": day_name,
            "count": count
        })
    
    return data


@router.get("/habits", response_model=dict)
async def get_habit_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get habit completion statistics"""
    db = get_database()
    user_id = current_user["_id"]
    
    habits = await db.habits.find({"user_id": user_id}).to_list(100)
    
    today = datetime.utcnow().date()
    
    # Calculate completion rates
    habit_stats = []
    for habit in habits:
        completions = habit.get("completedDates", [])
        total_days = (today - datetime.fromisoformat(habit.get("createdAt", datetime.utcnow().isoformat())).date()).days + 1
        completion_rate = len(completions) / max(total_days, 1) * 100
        
        # Current streak
        streak = 0
        check_date = today
        while check_date.isoformat() in completions:
            streak += 1
            check_date = check_date - timedelta(days=1)
        
        habit_stats.append({
            "id": str(habit["_id"]),
            "name": habit.get("name"),
            "completionRate": round(completion_rate, 1),
            "currentStreak": streak,
            "totalCompletions": len(completions)
        })
    
    return {
        "habits": habit_stats,
        "totalHabits": len(habits),
        "averageCompletionRate": round(sum(h["completionRate"] for h in habit_stats) / max(len(habit_stats), 1), 1)
    }

