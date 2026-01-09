"""
LLM integration routes - supports Gemini (free), Groq (free), and OpenAI
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
import httpx
import json
from datetime import datetime

router = APIRouter()

# System prompt for task parsing
SYSTEM_PROMPT = """You are a helpful task management assistant. Your job is to help users create and manage tasks.

When a user describes a task, extract the following information:
- title: A concise title for the task
- description: Additional details (optional)
- dueDate: If mentioned, in ISO format (YYYY-MM-DDTHH:MM:SS), null otherwise
- priority: "none", "low", "medium", or "high" based on urgency words
- tags: Any categories or labels mentioned as an array

Respond ONLY with valid JSON in this exact format:
{
    "title": "task title here",
    "description": "description or empty string",
    "dueDate": "2025-01-15T10:00:00" or null,
    "priority": "none",
    "tags": ["tag1", "tag2"]
}

Examples of urgency mapping:
- "urgent", "ASAP", "immediately", "critical" → "high"
- "important", "soon" → "medium"  
- "when you can", "low priority" → "low"
- No urgency mentioned → "none"

Examples of date parsing:
- "tomorrow" → tomorrow's date at 9:00 AM
- "next Monday" → next Monday at 9:00 AM
- "in 2 hours" → current time + 2 hours
- "end of day" → today at 17:00
- No date mentioned → null"""


def get_encryption_key():
    """Get encryption key from environment"""
    key = os.getenv("ENCRYPTION_KEY", "taskflow-default-key-change-in-production")
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


async def call_gemini(api_key: str, messages: list, system_prompt: str = None) -> str:
    """Call Google Gemini API (free tier available)"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Build contents array
    contents = []
    
    # Add system instruction if provided
    system_instruction = None
    if system_prompt:
        system_instruction = {"parts": [{"text": system_prompt}]}
    
    # Add conversation messages
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
    
    payload = {"contents": contents}
    if system_instruction:
        payload["systemInstruction"] = system_instruction
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        
        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_detail}")
        
        data = response.json()
        
        if "candidates" in data and len(data["candidates"]) > 0:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini")


async def call_groq(api_key: str, messages: list, system_prompt: str = None) -> str:
    """Call Groq API (free tier available with Llama models)"""
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    # Build messages array
    api_messages = []
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})
    
    for msg in messages:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.1-8b-instant",  # Fast, free model
        "messages": api_messages,
        "temperature": 0.7,
        "max_tokens": 1024
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {error_detail}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_openai(api_key: str, messages: list, system_prompt: str = None) -> str:
    """Call OpenAI API"""
    url = "https://api.openai.com/v1/chat/completions"
    
    api_messages = []
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})
    
    for msg in messages:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": api_messages,
        "temperature": 0.7,
        "max_tokens": 1024
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI API error: {error_detail}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_llm(provider: str, api_key: str, messages: list, system_prompt: str = None) -> str:
    """Call the appropriate LLM based on provider"""
    if provider == "gemini":
        return await call_gemini(api_key, messages, system_prompt)
    elif provider == "groq":
        return await call_groq(api_key, messages, system_prompt)
    elif provider == "openai":
        return await call_openai(api_key, messages, system_prompt)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")


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
    
    if not config.apiKey or len(config.apiKey) < 10:
        raise HTTPException(status_code=400, detail="Invalid API key")
    
    # Validate provider
    valid_providers = ["gemini", "groq", "openai"]
    if config.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Choose from: {', '.join(valid_providers)}")
    
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


def parse_llm_response(response_text: str) -> dict:
    """Parse the LLM response to extract task data"""
    # Try to extract JSON from the response
    try:
        # First, try to parse the entire response as JSON
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON in the response (between { and })
    try:
        start = response_text.find('{')
        end = response_text.rfind('}') + 1
        if start != -1 and end > start:
            json_str = response_text[start:end]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    # If all else fails, create a basic task from the response
    return {
        "title": response_text[:100] if response_text else "New Task",
        "description": "",
        "dueDate": None,
        "priority": "none",
        "tags": []
    }


@router.post("/parse", response_model=dict)
async def parse_input(
    request: LLMParseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Parse natural language input into a task"""
    if not current_user.get("llmProvider") or not current_user.get("llmApiKey"):
        raise HTTPException(
            status_code=400,
            detail="AI not configured. Please set up your API key in Settings."
        )
    
    try:
        api_key = decrypt_api_key(current_user["llmApiKey"])
        provider = current_user["llmProvider"]
        
        # Add current date context to help with date parsing
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M")
        context_prompt = f"{SYSTEM_PROMPT}\n\nCurrent date and time: {current_date}"
        
        messages = [{"role": "user", "content": request.input}]
        
        response_text = await call_llm(provider, api_key, messages, context_prompt)
        
        task_data = parse_llm_response(response_text)
        
        return {
            "success": True,
            "task": task_data,
            "message": f"Created task: {task_data.get('title', 'New Task')}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


@router.post("/chat", response_model=dict)
async def chat(
    request: LLMChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI assistant for task management help"""
    if not current_user.get("llmProvider") or not current_user.get("llmApiKey"):
        raise HTTPException(
            status_code=400,
            detail="AI not configured. Please set up your API key in Settings."
        )
    
    try:
        api_key = decrypt_api_key(current_user["llmApiKey"])
        provider = current_user["llmProvider"]
        
        # Chat system prompt
        chat_system = """You are a helpful task management assistant called TaskFlow AI. You help users:
- Create and organize tasks
- Set priorities and due dates
- Manage their productivity

Be concise, friendly, and helpful. If a user wants to create a task, extract the details and confirm what you'll create.
When you understand a task, respond with the task details in JSON format like this:
{"action": "create_task", "task": {"title": "...", "description": "...", "dueDate": null, "priority": "none", "tags": []}}

For general questions or conversation, just respond normally without JSON."""
        
        # Build conversation history
        messages = []
        for msg in request.conversationHistory:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": request.message})
        
        response_text = await call_llm(provider, api_key, messages, chat_system)
        
        # Check if response contains a task action
        task = None
        try:
            if '{"action"' in response_text:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start != -1 and end > start:
                    action_data = json.loads(response_text[start:end])
                    if action_data.get("action") == "create_task":
                        task = action_data.get("task")
                        response_text = f"I'll create this task for you:\n\n**{task.get('title')}**"
                        if task.get('description'):
                            response_text += f"\n{task.get('description')}"
                        if task.get('dueDate'):
                            response_text += f"\nDue: {task.get('dueDate')}"
                        if task.get('priority') and task.get('priority') != 'none':
                            response_text += f"\nPriority: {task.get('priority').capitalize()}"
        except:
            pass
        
        return {
            "success": True,
            "message": response_text,
            "task": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


@router.get("/providers", response_model=dict)
async def get_providers():
    """Get list of supported LLM providers"""
    return {
        "providers": [
            {
                "id": "gemini",
                "name": "Google Gemini",
                "description": "Free tier available - Get API key at ai.google.dev",
                "free": True
            },
            {
                "id": "groq",
                "name": "Groq (Llama)",
                "description": "Free tier available - Get API key at console.groq.com",
                "free": True
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "description": "Requires paid API key - Get at platform.openai.com",
                "free": False
            }
        ]
    }
