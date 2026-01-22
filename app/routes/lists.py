"""
List routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from app.models import ListCreate, ListUpdate
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId

router = APIRouter()


@router.get("/", response_model=dict)
async def get_lists(current_user: dict = Depends(get_current_user)):
    """Get all lists for the user"""
    db = get_database()
    
    lists = await db.lists.find({
        "user": ObjectId(current_user["_id"]),
        "isArchived": False
    }).sort("order", 1).to_list(None)
    
    # Get task counts - use original ObjectId before converting
    for list_item in lists:
        task_count = await db.tasks.count_documents({
            "list": list_item["_id"],  # Use original ObjectId
            "status": {"$nin": ["completed", "skipped"]}  # Count non-completed tasks
        })
        list_item["taskCount"] = task_count
        # Now convert IDs to strings
        list_item["_id"] = str(list_item["_id"])
        list_item["user"] = str(list_item["user"])
    
    return {"lists": lists}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_list(list_data: ListCreate, current_user: dict = Depends(get_current_user)):
    """Create a new list"""
    db = get_database()
    
    list_doc = {
        "name": list_data.name,
        "user": ObjectId(current_user["_id"]),
        "color": list_data.color,
        "icon": list_data.icon,
        "isDefault": False,
        "isSmart": False,
        "smartFilter": None,
        "parent": ObjectId(list_data.parent) if list_data.parent else None,
        "order": 0,
        "isArchived": False
    }
    
    result = await db.lists.insert_one(list_doc)
    list_id = result.inserted_id
    
    list_doc["_id"] = str(list_id)
    list_doc["user"] = str(list_doc["user"])
    list_doc["taskCount"] = 0
    
    return {"list": list_doc}


@router.put("/{list_id}", response_model=dict)
async def update_list(
    list_id: str,
    list_data: ListUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a list"""
    db = get_database()
    
    list_item = await db.lists.find_one({
        "_id": ObjectId(list_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not list_item:
        raise HTTPException(status_code=404, detail="List not found")
    
    update_data = {}
    if list_data.name is not None:
        update_data["name"] = list_data.name
    if list_data.color is not None:
        update_data["color"] = list_data.color
    if list_data.icon is not None:
        update_data["icon"] = list_data.icon
    if list_data.order is not None:
        update_data["order"] = list_data.order
    
    if update_data:
        await db.lists.update_one(
            {"_id": ObjectId(list_id)},
            {"$set": update_data}
        )
    
    updated_list = await db.lists.find_one({"_id": ObjectId(list_id)})
    updated_list["_id"] = str(updated_list["_id"])
    updated_list["user"] = str(updated_list["user"])
    
    return {"list": updated_list}


@router.delete("/{list_id}", response_model=dict)
async def delete_list(list_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a list"""
    db = get_database()
    
    list_item = await db.lists.find_one({
        "_id": ObjectId(list_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not list_item:
        raise HTTPException(status_code=404, detail="List not found")
    
    if list_item.get("isDefault"):
        raise HTTPException(status_code=400, detail="Cannot delete default lists")
    
    # Move tasks to inbox
    inbox = await db.lists.find_one({
        "user": ObjectId(current_user["_id"]),
        "name": "Inbox"
    })
    
    if inbox:
        await db.tasks.update_many(
            {"list": ObjectId(list_id)},
            {"$set": {"list": inbox["_id"]}}
        )
    
    await db.lists.delete_one({"_id": ObjectId(list_id)})
    
    return {"message": "List deleted successfully"}

