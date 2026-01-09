"""
LLM integration routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from app.models import LLMConfig, LLMParseRequest, LLMChatRequest
from app.auth import get_current_user
from app.database import get_database
from bson import ObjectId
from cryptography.fernet import Fernet
import os
import base64
import hashlib

router = APIRouter()


def get_encryption_key():
    """Get encryption key from environment"""
    key = os.getenv("ENCRYPTION_KEY", "")
    # Convert to 32-byte key for Fernet
    key_bytes = hashlib.sha256(key.encode()).digest()
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_api_key(api_key: str) -> str:
    """Encrypt API key"""
    f = Fernet(get_encryption_key())
    return f.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt API key"""
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_key.encode()).decode()


@router.get("/config", response_model=dict)
async def get_llm_config(current_user: dict = Depends(get_current_user)):
    """Get LLM configuration status"""
    return {
        "provider": current_user.get("llmProvider"),
        "configured": bool(current_user.get("llmProvider") and current_user.get("llmApiKey"))
    }


@router.post("/config", response_model=dict)
async def set_llm_config(
    config: LLMConfig,
    current_user: dict = Depends(get_current_user)
):
    """Set LLM configuration"""
    db = get_database()
    
    # Test API key (simplified - would test actual API call)
    if not config.apiKey or len(config.apiKey) < 10:
        raise HTTPException(
            status_code=400,
            detail="Invalid API key"
        )
    
    encrypted_key = encrypt_api_key(config.apiKey)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "llmProvider": config.provider,
            "llmApiKey": encrypted_key
        }}
    )
    
    return {
        "message": "LLM configuration saved successfully",
        "provider": config.provider
    }


@router.delete("/config", response_model=dict)
async def remove_llm_config(current_user: dict = Depends(get_current_user)):
    """Remove LLM configuration"""
    db = get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "llmProvider": None,
            "llmApiKey": None
        }}
    )
    
    return {"message": "LLM configuration removed successfully"}


@router.post("/parse", response_model=dict)
async def parse_input(
    request: LLMParseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Parse natural language input"""
    if not current_user.get("llmProvider") or not current_user.get("llmApiKey"):
        raise HTTPException(
            status_code=400,
            detail="LLM not configured. Please set up your API key in settings."
        )
    
    # Placeholder - full implementation would call OpenAI/DeepSeek API
    # For now, return a simple parsed response
    return {
        "success": True,
        "data": {
            "title": request.input.split()[0] if request.input else "New Task",
            "description": request.input,
            "dueDate": None,
            "dueTime": None,
            "priority": "none",
            "tags": [],
            "recurrence": None,
            "subtasks": [],
            "needsClarification": False
        },
        "needsClarification": False,
        "clarificationQuestion": None
    }


@router.post("/chat", response_model=dict)
async def chat(
    request: LLMChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Continue conversation for clarifications"""
    if not current_user.get("llmProvider") or not current_user.get("llmApiKey"):
        raise HTTPException(
            status_code=400,
            detail="LLM not configured"
        )
    
    # Placeholder - full implementation would continue conversation
    return {
        "success": True,
        "data": {
            "title": "Task",
            "description": "",
            "dueDate": None,
            "dueTime": None,
            "priority": "none",
            "tags": [],
            "recurrence": None,
            "subtasks": [],
            "needsClarification": False
        },
        "needsClarification": False,
        "clarificationQuestion": None,
        "assistantMessage": "Task is ready!"
    }

