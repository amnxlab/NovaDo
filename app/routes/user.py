"""
User routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import PreferencesUpdate, PasswordChange
from app.auth import get_current_user, verify_password, get_password_hash
from app.database import get_database
from bson import ObjectId

router = APIRouter()


@router.get("/preferences", response_model=dict)
async def get_preferences(current_user: dict = Depends(get_current_user)):
    """Get user preferences"""
    return {"preferences": current_user.get("preferences", {})}


@router.put("/preferences", response_model=dict)
async def update_preferences(
    preferences: PreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences"""
    db = get_database()
    
    update_data = {}
    if preferences.theme is not None:
        update_data["preferences.theme"] = preferences.theme
    if preferences.language is not None:
        update_data["preferences.language"] = preferences.language
    if preferences.timezone is not None:
        update_data["preferences.timezone"] = preferences.timezone
    if preferences.notifications is not None:
        update_data["preferences.notifications"] = preferences.notifications
    if preferences.pomodoroSettings is not None:
        update_data["preferences.pomodoroSettings"] = preferences.pomodoroSettings
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    
    return {"preferences": updated_user.get("preferences", {})}


@router.post("/change-password", response_model=dict)
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    db = get_database()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not verify_password(password_data.currentPassword, user.get("password", "")):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"password": get_password_hash(password_data.newPassword)}}
    )
    
    return {"message": "Password changed successfully"}

