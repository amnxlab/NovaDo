"""
Banner Routes
Handles user banner image upload and settings for Task Matrix
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId

router = APIRouter()

# Allowed image types for banners
ALLOWED_BANNER_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
}

# Max file size (5MB)
MAX_BANNER_SIZE = 5 * 1024 * 1024

# Banner upload directory
BANNER_DIR = "uploads/banners"


class BannerSettingsUpdate(BaseModel):
    """Model for updating banner focal point settings"""
    focalPointX: int = Field(ge=0, le=100, default=50)
    focalPointY: int = Field(ge=0, le=100, default=50)


@router.post("/", response_model=dict)
async def upload_banner(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a banner image for Task Matrix"""
    
    # Check file type
    content_type = file.content_type
    if content_type not in ALLOWED_BANNER_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, WebP, or GIF image"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_BANNER_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be less than 5MB"
        )
    
    # Generate unique filename
    file_ext = ALLOWED_BANNER_TYPES[content_type]
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    user_id = str(current_user["_id"])
    filename = f"{user_id}_{timestamp}{file_ext}"
    
    # Ensure banner directory exists
    os.makedirs(BANNER_DIR, exist_ok=True)
    
    # Delete old banner if exists
    db = get_database()
    old_banner_url = current_user.get("preferences", {}).get("bannerUrl")
    if old_banner_url:
        old_filename = old_banner_url.split("/")[-1]
        old_path = os.path.join(BANNER_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Save new file
    file_path = os.path.join(BANNER_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update user preferences with banner URL
    banner_url = f"/uploads/banners/{filename}"
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "preferences.bannerUrl": banner_url,
            "preferences.bannerFocalX": 50,  # Reset focal point to center
            "preferences.bannerFocalY": 50
        }}
    )
    
    return {
        "success": True,
        "bannerUrl": banner_url,
        "message": "Banner uploaded successfully"
    }


@router.put("/settings", response_model=dict)
async def update_banner_settings(
    settings: BannerSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update banner focal point settings"""
    db = get_database()
    
    # Clamp values to 0-100 range (already validated by Pydantic, but extra safety)
    focal_x = max(0, min(100, settings.focalPointX))
    focal_y = max(0, min(100, settings.focalPointY))
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "preferences.bannerFocalX": focal_x,
            "preferences.bannerFocalY": focal_y
        }}
    )
    
    return {
        "success": True,
        "focalPointX": focal_x,
        "focalPointY": focal_y,
        "message": "Settings updated"
    }


@router.delete("/", response_model=dict)
async def remove_banner(
    current_user: dict = Depends(get_current_user)
):
    """Remove the user's banner image"""
    db = get_database()
    
    # Get current banner URL
    banner_url = current_user.get("preferences", {}).get("bannerUrl")
    
    if banner_url:
        # Delete file from disk
        filename = banner_url.split("/")[-1]
        file_path = os.path.join(BANNER_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    # Clear banner settings from user
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$unset": {
            "preferences.bannerUrl": "",
            "preferences.bannerFocalX": "",
            "preferences.bannerFocalY": ""
        }}
    )
    
    return {
        "success": True,
        "message": "Banner removed"
    }


@router.get("/", response_model=dict)
async def get_banner_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get the user's banner settings"""
    preferences = current_user.get("preferences", {})
    
    return {
        "bannerUrl": preferences.get("bannerUrl"),
        "focalPointX": preferences.get("bannerFocalX", 50),
        "focalPointY": preferences.get("bannerFocalY", 50)
    }
