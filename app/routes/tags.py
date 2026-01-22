"""
Tag routes - Hierarchical tag system
"""
from fastapi import APIRouter, HTTPException, Depends, status
from app.models import TagCreate, TagUpdate
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId
import re

router = APIRouter()


def generate_full_path(name: str, parent_path: str = None) -> str:
    """Generate fullPath from name and optional parent path"""
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if parent_path:
        return f"{parent_path}:{slug}"
    return slug


@router.get("/", response_model=dict)
async def get_tags(current_user: dict = Depends(get_current_user)):
    """Get all tags for the user with task counts - includes discovered tags from tasks"""
    db = get_database()
    
    # Get explicitly created tags
    explicit_tags = await db.tags.find({
        "user": ObjectId(current_user["_id"])
    }).sort("order", 1).to_list(None)
    
    # Build a map of explicit tag fullPaths
    explicit_paths = set()
    tag_map = {}
    for tag in explicit_tags:
        tag["_id"] = str(tag["_id"])
        tag["user"] = str(tag["user"])
        if tag.get("parentId"):
            tag["parentId"] = str(tag["parentId"])
        explicit_paths.add(tag.get("fullPath", ""))
        tag_map[tag.get("fullPath", "")] = tag
    
    # Discover tags from tasks that aren't explicitly created
    # Note: Mongita doesn't support $exists, so we fetch all tasks and filter in Python
    all_tasks_raw = await db.tasks.find({
        "user": ObjectId(current_user["_id"])
    }).to_list(None)
    
    # Filter to tasks that have non-empty tags
    all_tasks = [t for t in all_tasks_raw if t.get("tags") and len(t.get("tags", [])) > 0]
    
    discovered_tags = {}
    for task in all_tasks:
        for tag_str in task.get("tags", []):
            if tag_str and tag_str not in explicit_paths and tag_str not in discovered_tags:
                # Create a virtual tag entry for this discovered tag
                # Parse the tag string to determine hierarchy
                parts = tag_str.split(":")
                parent_path = None
                if len(parts) > 1:
                    parent_path = ":".join(parts[:-1])
                
                discovered_tags[tag_str] = {
                    "_id": f"discovered_{tag_str}",  # Virtual ID
                    "name": parts[-1].replace("-", " ").title(),  # Last part, formatted
                    "fullPath": tag_str,
                    "parentId": None,  # Will be linked later if parent exists
                    "user": str(current_user["_id"]),
                    "color": "#6B7280",  # Gray for discovered
                    "icon": "🏷️",
                    "order": 999,
                    "isDiscovered": True  # Flag to indicate this wasn't explicitly created
                }
                
                # Check if parent exists in explicit or discovered
                if parent_path:
                    if parent_path in tag_map:
                        discovered_tags[tag_str]["parentId"] = tag_map[parent_path]["_id"]
                    elif parent_path in discovered_tags:
                        discovered_tags[tag_str]["parentId"] = discovered_tags[parent_path]["_id"]
    
    # Merge explicit and discovered tags
    all_tags = list(explicit_tags) + list(discovered_tags.values())
    
    # Calculate task counts for each tag
    for tag in all_tags:
        full_path = tag.get("fullPath", "")
        
        # Direct count: tasks with this exact tag
        direct_count = await db.tasks.count_documents({
            "user": ObjectId(current_user["_id"]),
            "tags": full_path,
            "status": {"$nin": ["completed", "skipped"]}
        })
        
        # Total count: for parents, include all children
        if not tag.get("parentId"):  # This is a parent tag
            # Count tasks with this tag OR any child tag (starts with "fullpath:")
            total_count = await db.tasks.count_documents({
                "user": ObjectId(current_user["_id"]),
                "status": {"$nin": ["completed", "skipped"]},
                "$or": [
                    {"tags": full_path},
                    {"tags": {"$regex": f"^{re.escape(full_path)}:"}}
                ]
            })
            tag["taskCount"] = total_count
        else:
            tag["taskCount"] = direct_count
    
    return {"tags": all_tags}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tag(tag_data: TagCreate, current_user: dict = Depends(get_current_user)):
    """Create a new tag (parent or child)"""
    db = get_database()
    
    parent_path = None
    parent_id = None
    
    # If parentId provided, get parent's fullPath
    if tag_data.parentId:
        parent = await db.tags.find_one({
            "_id": ObjectId(tag_data.parentId),
            "user": ObjectId(current_user["_id"])
        })
        if not parent:
            raise HTTPException(status_code=404, detail="Parent tag not found")
        parent_path = parent.get("fullPath")
        parent_id = ObjectId(tag_data.parentId)
    
    full_path = generate_full_path(tag_data.name, parent_path)
    
    # Check for duplicate fullPath
    existing = await db.tags.find_one({
        "user": ObjectId(current_user["_id"]),
        "fullPath": full_path
    })
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    # Get max order
    max_order_tag = await db.tags.find_one(
        {"user": ObjectId(current_user["_id"])},
        sort=[("order", -1)]
    )
    next_order = (max_order_tag.get("order", 0) + 1) if max_order_tag else 0
    
    tag_doc = {
        "name": tag_data.name,
        "fullPath": full_path,
        "parentId": parent_id,
        "user": ObjectId(current_user["_id"]),
        "color": tag_data.color,
        "icon": tag_data.icon,
        "order": next_order
    }
    
    result = await db.tags.insert_one(tag_doc)
    tag_id = result.inserted_id
    
    tag_doc["_id"] = str(tag_id)
    tag_doc["user"] = str(tag_doc["user"])
    tag_doc["parentId"] = str(tag_doc["parentId"]) if tag_doc["parentId"] else None
    tag_doc["taskCount"] = 0
    
    return {"tag": tag_doc}


@router.put("/{tag_id}", response_model=dict)
async def update_tag(
    tag_id: str,
    tag_data: TagUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a tag"""
    db = get_database()
    
    tag = await db.tags.find_one({
        "_id": ObjectId(tag_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = {}
    old_full_path = tag.get("fullPath")
    
    if tag_data.name is not None:
        # Regenerate fullPath if name changes
        parent_path = None
        if tag.get("parentId"):
            parent = await db.tags.find_one({"_id": tag["parentId"]})
            if parent:
                parent_path = parent.get("fullPath")
        
        new_full_path = generate_full_path(tag_data.name, parent_path)
        update_data["name"] = tag_data.name
        update_data["fullPath"] = new_full_path
        
        # Update all tasks that have this tag
        if old_full_path != new_full_path:
            # Update exact matches
            await db.tasks.update_many(
                {"tags": old_full_path},
                {"$set": {"tags.$": new_full_path}}
            )
            
            # Update child tags' fullPaths
            child_tags = await db.tags.find({
                "user": ObjectId(current_user["_id"]),
                "fullPath": {"$regex": f"^{re.escape(old_full_path)}:"}
            }).to_list(None)
            
            for child in child_tags:
                child_new_path = child["fullPath"].replace(old_full_path, new_full_path, 1)
                await db.tags.update_one(
                    {"_id": child["_id"]},
                    {"$set": {"fullPath": child_new_path}}
                )
                # Update tasks with child tag
                await db.tasks.update_many(
                    {"tags": child["fullPath"]},
                    {"$set": {"tags.$": child_new_path}}
                )
    
    if tag_data.color is not None:
        update_data["color"] = tag_data.color
    if tag_data.icon is not None:
        update_data["icon"] = tag_data.icon
    if tag_data.order is not None:
        update_data["order"] = tag_data.order
    
    if update_data:
        await db.tags.update_one(
            {"_id": ObjectId(tag_id)},
            {"$set": update_data}
        )
    
    updated_tag = await db.tags.find_one({"_id": ObjectId(tag_id)})
    updated_tag["_id"] = str(updated_tag["_id"])
    updated_tag["user"] = str(updated_tag["user"])
    if updated_tag.get("parentId"):
        updated_tag["parentId"] = str(updated_tag["parentId"])
    
    return {"tag": updated_tag}


@router.delete("/{tag_id}", response_model=dict)
async def delete_tag(tag_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a tag and its children"""
    db = get_database()
    
    tag = await db.tags.find_one({
        "_id": ObjectId(tag_id),
        "user": ObjectId(current_user["_id"])
    })
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    full_path = tag.get("fullPath")
    
    # Remove tag from all tasks - Mongita doesn't support $pull, so we do it manually
    all_tasks = await db.tasks.find({"user": ObjectId(current_user["_id"])}).to_list(None)
    for task in all_tasks:
        task_tags = task.get("tags", [])
        if full_path in task_tags:
            new_tags = [t for t in task_tags if t != full_path]
            await db.tasks.update_one(
                {"_id": task["_id"]},
                {"$set": {"tags": new_tags}}
            )
    
    # Find child tags - Mongita doesn't support $regex, so filter in Python
    all_user_tags = await db.tags.find({
        "user": ObjectId(current_user["_id"])
    }).to_list(None)
    
    # Filter child tags: those whose fullPath starts with "parent_path:"
    child_prefix = f"{full_path}:"
    child_tags = [t for t in all_user_tags if t.get("fullPath", "").startswith(child_prefix)]
    
    for child in child_tags:
        child_full_path = child.get("fullPath", "")
        # Remove child tag from tasks
        for task in all_tasks:
            task_tags = task.get("tags", [])
            if child_full_path in task_tags:
                new_tags = [t for t in task_tags if t != child_full_path]
                await db.tasks.update_one(
                    {"_id": task["_id"]},
                    {"$set": {"tags": new_tags}}
                )
        await db.tags.delete_one({"_id": child["_id"]})
    
    # Delete the tag itself
    await db.tags.delete_one({"_id": ObjectId(tag_id)})
    
    return {"message": "Tag deleted successfully", "deletedChildren": len(child_tags)}
