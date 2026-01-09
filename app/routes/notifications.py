"""
Push Notification Routes
Handles web push notification subscriptions and sending
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.auth import get_current_user
from app.database import get_database

router = APIRouter()

# VAPID keys (in production, these should be environment variables)
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:admin@taskflow.app"}


class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    expirationTime: Optional[int] = None


class NotificationPayload(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/favicon.ico"
    tag: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, str]]] = None
    requireInteraction: Optional[bool] = False


@router.get("/vapid-key", response_model=dict)
async def get_vapid_key():
    """Get the VAPID public key for push subscriptions"""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=dict)
async def subscribe(
    subscription: PushSubscription,
    current_user: dict = Depends(get_current_user)
):
    """Save a push notification subscription"""
    db = get_database()
    
    # Store or update subscription
    await db.push_subscriptions.update_one(
        {"userId": current_user["_id"]},
        {
            "$set": {
                "userId": current_user["_id"],
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "expirationTime": subscription.expirationTime,
                "updatedAt": datetime.utcnow()
            },
            "$setOnInsert": {
                "createdAt": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Subscription saved"}


@router.post("/unsubscribe", response_model=dict)
async def unsubscribe(
    current_user: dict = Depends(get_current_user)
):
    """Remove a push notification subscription"""
    db = get_database()
    
    await db.push_subscriptions.delete_one({"userId": current_user["_id"]})
    
    return {"success": True, "message": "Subscription removed"}


@router.get("/status", response_model=dict)
async def get_subscription_status(
    current_user: dict = Depends(get_current_user)
):
    """Check if user has an active push subscription"""
    db = get_database()
    
    subscription = await db.push_subscriptions.find_one({"userId": current_user["_id"]})
    
    return {
        "subscribed": subscription is not None,
        "endpoint": subscription.get("endpoint") if subscription else None
    }


@router.post("/send", response_model=dict)
async def send_notification(
    payload: NotificationPayload,
    current_user: dict = Depends(get_current_user)
):
    """Send a push notification to the user (for testing)"""
    db = get_database()
    
    subscription = await db.push_subscriptions.find_one({"userId": current_user["_id"]})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    if not VAPID_PRIVATE_KEY:
        # Fall back to just returning success - the client will use local notifications
        return {
            "success": True,
            "message": "Notification sent (local mode)",
            "localFallback": True
        }
    
    try:
        # Try to send via web push (requires pywebpush)
        from pywebpush import webpush, WebPushException
        
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": subscription["keys"]
            },
            data=json.dumps(payload.dict()),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        
        return {"success": True, "message": "Notification sent"}
    except ImportError:
        return {
            "success": True,
            "message": "Notification sent (local mode - pywebpush not installed)",
            "localFallback": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


@router.get("/settings", response_model=dict)
async def get_notification_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get user's notification preferences"""
    db = get_database()
    
    user = await db.users.find_one({"_id": current_user["_id"]})
    preferences = user.get("preferences", {}).get("notifications", {})
    
    return {
        "settings": {
            "taskReminders": preferences.get("taskReminders", True),
            "habitReminders": preferences.get("habitReminders", True),
            "pomodoroAlerts": preferences.get("pomodoroAlerts", True),
            "dailySummary": preferences.get("dailySummary", False),
            "reminderMinutes": preferences.get("reminderMinutes", 30)
        }
    }


class NotificationSettingsUpdate(BaseModel):
    taskReminders: Optional[bool] = None
    habitReminders: Optional[bool] = None
    pomodoroAlerts: Optional[bool] = None
    dailySummary: Optional[bool] = None
    reminderMinutes: Optional[int] = None


@router.put("/settings", response_model=dict)
async def update_notification_settings(
    settings: NotificationSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    db = get_database()
    
    update_data = {}
    for key, value in settings.dict(exclude_none=True).items():
        update_data[f"preferences.notifications.{key}"] = value
    
    if update_data:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Settings updated"}

