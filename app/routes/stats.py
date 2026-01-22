"""
Statistics Routes
Handles productivity statistics and analytics
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from collections import defaultdict
from bson import ObjectId

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
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    
    # Get all user's tasks
    tasks = await db.tasks.find({"user": user_oid}).to_list(1000)
    
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
    
    # Today's pomodoro sessions (using new focus_sessions)
    pomodoro_sessions = await db.focus_sessions.count_documents({
        "user": user_id,
        "type": "pomo",
        "startTime": {"$gte": today}
    }) if hasattr(db, 'focus_sessions') else 0
    
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
        "skippedTasks": len([t for t in tasks if t.get("status") == "skipped"]),
        "pendingTasks": len([t for t in tasks if t.get("status") not in ["completed", "skipped"]])
    }


async def calculate_streak(db, user_id) -> int:
    """Calculate the current streak of days with completed tasks"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    tasks = await db.tasks.find({
        "user": user_oid,
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
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    tasks = await db.tasks.find({
        "user": user_oid,
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
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    habits = await db.habits.find({"user": user_oid}).to_list(100)
    
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


@router.get("/monthly", response_model=dict)
async def get_monthly_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get monthly aggregated statistics"""
    db = get_database()
    user_id = current_user["_id"]
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    # Get all tasks
    tasks = await db.tasks.find({"user": user_oid}).to_list(1000)
    
    # Filter tasks from this month
    month_tasks = [t for t in tasks if t.get("createdAt") and datetime.fromisoformat(t.get("createdAt").replace("Z", "+00:00")) >= month_start]
    
    # Calculate total focus hours from Pomodoro sessions
    focus_sessions = await db.focus_sessions.find({
        "user": user_oid,
        "type": "pomo",
        "startTime": {"$gte": month_start}
    }).to_list(1000) if hasattr(db, 'focus_sessions') else []
    
    total_focus_minutes = sum(s.get("duration", 25) for s in focus_sessions)
    total_focus_hours = round(total_focus_minutes / 60, 1)
    
    # Category breakdown (by tags/lists)
    category_counts = defaultdict(int)
    for task in month_tasks:
        if task.get("tags"):
            for tag in task.get("tags", []):
                category_counts[tag] += 1
        elif task.get("list_id"):
            category_counts["List Tasks"] += 1
        else:
            category_counts["Inbox"] += 1
    
    # Goal achievement (placeholder - would need user goals)
    completed_this_month = len([t for t in month_tasks if t.get("status") == "completed"])
    goal_achievement = min(100, round((completed_this_month / max(len(month_tasks), 1)) * 100, 1))
    
    return {
        "totalFocusHours": total_focus_hours,
        "goalAchievement": goal_achievement,
        "categoryBreakdown": dict(category_counts),
        "completedTasks": completed_this_month,
        "totalTasks": len(month_tasks)
    }


@router.get("/insights", response_model=dict)
async def get_insights(
    current_user: dict = Depends(get_current_user)
):
    """Get AI-generated insights (placeholder for future AI integration)"""
    db = get_database()
    user_id = current_user["_id"]
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Get tasks for pattern analysis
    tasks = await db.tasks.find({"user": user_oid}).to_list(1000)
    
    # Analyze completion patterns by day of week
    day_completions = defaultdict(int)
    for task in tasks:
        if task.get("status") == "completed" and task.get("completedAt"):
            try:
                completed_date = datetime.fromisoformat(task["completedAt"].replace("Z", "+00:00"))
                day_name = completed_date.strftime("%A")
                day_completions[day_name] += 1
            except:
                pass
    
    # Find most productive day
    most_productive_day = max(day_completions.items(), key=lambda x: x[1]) if day_completions else ("Monday", 0)
    
    # Generate insights
    insights = []
    if most_productive_day[1] > 0:
        insights.append(f"You're most productive on {most_productive_day[0]}s—schedule key tasks then!")
    
    # Placeholder for more insights
    insights.append("Your focus peaks in the morning—plan important work during that time.")
    insights.append("You complete more tasks when you start with a Pomodoro session.")
    
    return {
        "insights": insights,
        "patterns": {
            "mostProductiveDay": most_productive_day[0],
            "dayCompletions": dict(day_completions)
        }
    }


@router.get("/gamification", response_model=dict)
async def get_gamification_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get gamification data (level, badges, rewards)"""
    db = get_database()
    user_id = current_user["_id"]
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Get all tasks
    tasks = await db.tasks.find({"user": user_oid}).to_list(1000)
    
    # Calculate XP and level
    completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
    pomodoro_sessions = await db.focus_sessions.count_documents({
        "user": user_oid,
        "type": "pomo"
    }) if hasattr(db, 'focus_sessions') else 0
    
    # Calculate streak
    streak = await calculate_streak(db, user_id)
    
    xp = completed_tasks * 10 + pomodoro_sessions * 5 + streak * 20
    level = (xp // 100) + 1
    
    # Determine earned badges
    badges = []
    if completed_tasks > 0:
        badges.append({"id": "first-task", "name": "First Task", "icon": "🎯", "earned": True})
    if streak >= 7:
        badges.append({"id": "streak-7", "name": "7 Day Streak", "icon": "🔥", "earned": True})
    if pomodoro_sessions >= 50:
        badges.append({"id": "pomodoro-master", "name": "Pomodoro Master", "icon": "🍅", "earned": True})
    if completed_tasks >= 100:
        badges.append({"id": "completionist", "name": "Completionist", "icon": "✅", "earned": True})
    
    return {
        "level": level,
        "xp": xp,
        "xpToNextLevel": 100 - (xp % 100),
        "badges": badges,
        "streak": streak
    }
