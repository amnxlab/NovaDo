"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from app.models import UserRegister, UserLogin, UserResponse
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.database import get_database
from bson import ObjectId
from datetime import timedelta
import os

router = APIRouter()


async def create_default_lists(user_id: ObjectId):
    """Create default lists for a new user"""
    db = get_database()
    default_lists = [
        {"name": "Inbox", "icon": "inbox", "color": "#1890ff", "isDefault": True, "isSmart": False, "user": user_id, "order": 0},
        {"name": "Today", "icon": "calendar", "color": "#52c41a", "isDefault": True, "isSmart": True, "smartFilter": {"dueDate": "today"}, "user": user_id, "order": 1},
        {"name": "Next 7 Days", "icon": "calendar-week", "color": "#faad14", "isDefault": True, "isSmart": True, "smartFilter": {"dueDate": "next7days"}, "user": user_id, "order": 2},
        {"name": "All", "icon": "list", "color": "#722ed1", "isDefault": True, "isSmart": True, "smartFilter": {"status": "active"}, "user": user_id, "order": 3},
        {"name": "Completed", "icon": "check-circle", "color": "#13c2c2", "isDefault": True, "isSmart": True, "smartFilter": {"status": "completed"}, "user": user_id, "order": 4}
    ]
    await db.lists.insert_many(default_lists)


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register a new user"""
    db = get_database()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_doc = {
        "email": user_data.email.lower(),
        "password": get_password_hash(user_data.password),
        "name": user_data.name,
        "avatar": None,
        "googleId": None,
        "googleAccessToken": None,
        "googleRefreshToken": None,
        "llmProvider": None,
        "llmApiKey": None,
        "preferences": {
            "theme": "light",
            "language": "en",
            "notifications": {
                "email": True,
                "push": True,
                "taskReminders": True
            },
            "pomodoroSettings": {
                "workDuration": 25,
                "shortBreak": 5,
                "longBreak": 15,
                "sessionsBeforeLongBreak": 4
            }
        },
        "pushSubscription": None,
        "isVerified": False,
        "isActive": True,
        "stats": {
            "totalTasksCompleted": 0,
            "currentStreak": 0,
            "longestStreak": 0,
            "lastCompletionDate": None
        }
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id
    
    # Create default lists
    await create_default_lists(user_id)
    
    # Generate token
    access_token = create_access_token(data={"id": str(user_id), "email": user_data.email})
    
    user_doc["_id"] = str(user_id)
    user_doc.pop("password", None)
    user_doc.pop("googleAccessToken", None)
    user_doc.pop("googleRefreshToken", None)
    user_doc.pop("llmApiKey", None)
    
    return {
        "token": access_token,
        "user": user_doc
    }


@router.post("/login", response_model=dict)
async def login(user_data: UserLogin):
    """Login with email and password"""
    db = get_database()
    
    user = await db.users.find_one({"email": user_data.email.lower()})
    
    if not user or not verify_password(user_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate token
    access_token = create_access_token(data={"id": str(user["_id"]), "email": user["email"]})
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    user.pop("googleAccessToken", None)
    user.pop("googleRefreshToken", None)
    user.pop("llmApiKey", None)
    
    return {
        "token": access_token,
        "user": user
    }


@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_CALLBACK_URL", "http://localhost:5000/api/auth/google/callback")
    
    if not google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    # Google OAuth URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={google_client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=profile email https://www.googleapis.com/auth/calendar&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback"""
    client_url = os.getenv("CLIENT_URL", "http://localhost:3000")
    return RedirectResponse(url=f"{client_url}/auth/callback?error=not_implemented")


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {"user": current_user}


@router.put("/profile", response_model=dict)
async def update_profile(
    name: str = None,
    avatar: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    db = get_database()
    update_data = {}
    
    if name:
        update_data["name"] = name
    if avatar:
        update_data["avatar"] = avatar
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_data}
        )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password", None)
    updated_user.pop("googleAccessToken", None)
    updated_user.pop("googleRefreshToken", None)
    updated_user.pop("llmApiKey", None)
    
    return {"user": updated_user}


@router.post("/disconnect-google", response_model=dict)
async def disconnect_google(current_user: dict = Depends(get_current_user)):
    """Disconnect Google account"""
    db = get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "googleAccessToken": None,
            "googleRefreshToken": None
        }}
    )
    
    return {"message": "Google account disconnected successfully"}
