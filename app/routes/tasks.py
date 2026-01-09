"""
Task routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import timedelta
from datetime import datetime
from app.models import TaskCreate, TaskUpdate, TaskResponse
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId


class TaskReorderRequest(BaseModel):
    taskIds: List[str]

router = APIRouter()


@router.get("/", response_model=dict)
async def get_tasks(
    list: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    dueDate: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks for the user"""
    db = get_database()
    query = {"user": ObjectId(current_user["_id"])}
    
    if list:
        query["list"] = ObjectId(list)
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    if dueDate:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if dueDate == "today":
            tomorrow = today.replace(day=today.day + 1)
            query["dueDate"] = {"$gte": today, "$lt": tomorrow}
        elif dueDate == "next7days":
            next_week = today.replace(day=today.day + 7)
            query["dueDate"] = {"$gte": today, "$lte": next_week}
        elif dueDate == "overdue":
            query["dueDate"] = {"$lt": today}
            query["status"] = "active"
    
    tasks = await db.tasks.find(query).sort("order", 1).to_list(None)
    
    # Populate list information
    for task in tasks:
        task["_id"] = str(task["_id"])
        task["user"] = str(task["user"])
        task["list"] = str(task["list"])
        if isinstance(task.get("list"), ObjectId):
            list_doc = await db.lists.find_one({"_id": task["list"]})
            if list_doc:
                task["list"] = {
                    "_id": str(list_doc["_id"]),
                    "name": list_doc.get("name"),
                    "color": list_doc.get("color"),
                    "icon": list_doc.get("icon")
                }
    
    return {"tasks": tasks}


@router.get("/{task_id}", response_model=dict)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single task"""
    db = get_database()
    
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task["_id"] = str(task["_id"])
    task["user"] = str(task["user"])
    task["list"] = str(task["list"])
    
    # Populate list
    list_doc = await db.lists.find_one({"_id": ObjectId(task["list"])})
    if list_doc:
        task["list"] = {
            "_id": str(list_doc["_id"]),
            "name": list_doc.get("name"),
            "color": list_doc.get("color"),
            "icon": list_doc.get("icon")
        }
    
    return {"task": task}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    db = get_database()
    
    # Handle empty or missing list - find user's Inbox list
    list_id = task_data.list
    if not list_id or (isinstance(list_id, str) and list_id.strip() == ""):
        # Find the user's Inbox list
        inbox_list = await db.lists.find_one({
            "user": ObjectId(current_user["_id"]),
            "name": "Inbox",
            "isDefault": True
        })
        if not inbox_list:
            raise HTTPException(status_code=404, detail="Inbox list not found. Please contact support.")
        list_id = str(inbox_list["_id"])
    
    # Verify list belongs to user
    list_doc = await db.lists.find_one({
        "_id": ObjectId(list_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not list_doc:
        raise HTTPException(status_code=404, detail="List not found")
    
    task_doc = {
        "title": task_data.title,
        "description": task_data.description or "",
        "user": ObjectId(current_user["_id"]),
        "list": ObjectId(list_id),
        "dueDate": task_data.dueDate,
        "dueTime": task_data.dueTime,
        "priority": task_data.priority.value,
        "status": "scheduled",
        "tags": task_data.tags,
        "subtasks": [s.dict() for s in task_data.subtasks],
        "attachments": [a.dict() for a in task_data.attachments] if task_data.attachments else [],
        "reminders": [],
        "recurrence": task_data.recurrence.dict() if task_data.recurrence else {"enabled": False},
        "googleCalendarEventId": None,
        "syncedWithGoogle": False,
        "pomodoroSessions": [],
        "order": 0,
        "createdByAI": False,
        "completedAt": None,
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }
    
    result = await db.tasks.insert_one(task_doc)
    task_id = result.inserted_id
    
    task_doc["_id"] = str(task_id)
    task_doc["user"] = str(task_doc["user"])
    task_doc["list"] = {
        "_id": str(list_doc["_id"]),
        "name": list_doc.get("name"),
        "color": list_doc.get("color"),
        "icon": list_doc.get("icon")
    }
    
    return {"task": task_doc}


@router.put("/{task_id}", response_model=dict)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a task"""
    db = get_database()
    
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {}
    
    if task_data.title is not None:
        update_data["title"] = task_data.title
    if task_data.description is not None:
        update_data["description"] = task_data.description
    if task_data.list is not None:
        # Verify new list belongs to user
        list_doc = await db.lists.find_one({
            "_id": ObjectId(task_data.list),
            "user": ObjectId(current_user["_id"])
        })
        if not list_doc:
            raise HTTPException(status_code=404, detail="List not found")
        update_data["list"] = ObjectId(task_data.list)
    if task_data.dueDate is not None:
        update_data["dueDate"] = task_data.dueDate
    if task_data.dueTime is not None:
        update_data["dueTime"] = task_data.dueTime
    if task_data.priority is not None:
        update_data["priority"] = task_data.priority.value
    if task_data.status is not None:
        update_data["status"] = task_data.status.value
        # Track when task was started (in_progress)
        if task_data.status.value == "in_progress" and task.get("status") != "in_progress":
            update_data["startedAt"] = datetime.now()
        # Track when task was completed
        if task_data.status.value == "completed" and task.get("status") != "completed":
            update_data["completedAt"] = datetime.now()
            # Update user stats
            await db.users.update_one(
                {"_id": ObjectId(current_user["_id"])},
                {"$inc": {"stats.totalTasksCompleted": 1}}
            )
        # If task is reopened, clear completedAt
        if task_data.status.value != "completed" and task.get("status") == "completed":
            update_data["completedAt"] = None
    if task_data.tags is not None:
        update_data["tags"] = task_data.tags
    if task_data.subtasks is not None:
        update_data["subtasks"] = [s.dict() for s in task_data.subtasks]
    if task_data.attachments is not None:
        update_data["attachments"] = [a.dict() for a in task_data.attachments]
    
    update_data["updatedAt"] = datetime.now()
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    # Fetch updated task
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    updated_task["_id"] = str(updated_task["_id"])
    updated_task["user"] = str(updated_task["user"])
    
    # Convert list ObjectId to string or object
    if updated_task.get("list"):
        if isinstance(updated_task["list"], ObjectId):
            list_doc = await db.lists.find_one({"_id": updated_task["list"]})
            if list_doc:
                updated_task["list"] = {
                    "_id": str(list_doc["_id"]),
                    "name": list_doc.get("name"),
                    "color": list_doc.get("color"),
                    "icon": list_doc.get("icon")
                }
            else:
                updated_task["list"] = str(updated_task["list"])
    
    return {"task": updated_task}


@router.delete("/{task_id}", response_model=dict)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    db = get_database()
    
    result = await db.tasks.delete_one({
        "_id": ObjectId(task_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}


@router.patch("/bulk-update", response_model=dict)
async def bulk_update_tasks(
    updates: List[dict],
    current_user: dict = Depends(get_current_user)
):
    """Bulk update tasks (for reordering)"""
    db = get_database()
    
    for update in updates:
        await db.tasks.update_one(
            {"_id": ObjectId(update["id"]), "user": ObjectId(current_user["_id"])},
            {"$set": {
                "order": update.get("order", 0),
                **({"list": ObjectId(update["list"])} if "list" in update else {})
            }}
        )
    
    return {"message": "Tasks updated successfully"}


@router.get("/stats/summary", response_model=dict)
async def get_task_stats(current_user: dict = Depends(get_current_user)):
    """Get task statistics"""
    db = get_database()
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_active = await db.tasks.count_documents({
        "user": ObjectId(current_user["_id"]),
        "status": "scheduled"
    })
    
    completed_today = await db.tasks.count_documents({
        "user": ObjectId(current_user["_id"]),
        "status": "completed",
        "completedAt": {"$gte": today}
    })
    
    overdue = await db.tasks.count_documents({
        "user": ObjectId(current_user["_id"]),
        "status": "scheduled",
        "dueDate": {"$lt": today}
    })
    
    next_week = today.replace(day=today.day + 7)
    upcoming = await db.tasks.count_documents({
        "user": ObjectId(current_user["_id"]),
        "status": "scheduled",
        "dueDate": {"$gte": today, "$lte": next_week}
    })
    
    return {
        "stats": {
            "totalActive": total_active,
            "completedToday": completed_today,
            "overdue": overdue,
            "upcoming": upcoming
        }
    }


@router.post("/reorder", response_model=dict)
async def reorder_tasks(
    request: TaskReorderRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reorder tasks by their IDs"""
    db = get_database()
    
    # Update order for each task
    for index, task_id in enumerate(request.taskIds):
        await db.tasks.update_one(
            {
                "_id": ObjectId(task_id),
                "user": ObjectId(current_user["_id"])
            },
            {"$set": {"order": index}}
        )
    
    return {"success": True, "message": "Tasks reordered"}
