"""
File Upload Routes
Handles file attachments for tasks
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import List
from datetime import datetime

from app.auth import get_current_user
from app.database import get_database

router = APIRouter()

# Allowed file types
ALLOWED_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'application/zip': '.zip'
}

# Max file size (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024

# Upload directory
UPLOAD_DIR = "uploads"


@router.post("/", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file attachment"""
    
    # Check file type
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_TYPES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_ext = ALLOWED_TYPES[content_type]
    file_id = str(uuid.uuid4())
    user_id = str(current_user["_id"])
    filename = f"{user_id}_{file_id}{file_ext}"
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Store metadata in database
    db = get_database()
    file_record = {
        "fileId": file_id,
        "userId": current_user["_id"],
        "originalName": file.filename,
        "storedName": filename,
        "contentType": content_type,
        "size": len(content),
        "uploadedAt": datetime.utcnow()
    }
    await db.files.insert_one(file_record)
    
    # Return file info
    return {
        "id": file_id,
        "name": file.filename,
        "type": content_type,
        "size": len(content),
        "url": f"/uploads/{filename}"
    }


@router.get("/{file_id}", response_class=FileResponse)
async def get_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get an uploaded file"""
    db = get_database()
    
    # Find file record
    file_record = await db.files.find_one({
        "fileId": file_id,
        "userId": current_user["_id"]
    })
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = os.path.join(UPLOAD_DIR, file_record["storedName"])
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        file_path,
        media_type=file_record["contentType"],
        filename=file_record["originalName"]
    )


@router.delete("/{file_id}", response_model=dict)
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an uploaded file"""
    db = get_database()
    
    # Find file record
    file_record = await db.files.find_one({
        "fileId": file_id,
        "userId": current_user["_id"]
    })
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete from disk
    file_path = os.path.join(UPLOAD_DIR, file_record["storedName"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    await db.files.delete_one({"fileId": file_id})
    
    return {"success": True, "message": "File deleted"}


@router.get("/", response_model=dict)
async def list_files(
    current_user: dict = Depends(get_current_user)
):
    """List all files uploaded by the user"""
    db = get_database()
    
    files = await db.files.find({"userId": current_user["_id"]}).to_list(100)
    
    return {
        "files": [
            {
                "id": f["fileId"],
                "name": f["originalName"],
                "type": f["contentType"],
                "size": f["size"],
                "url": f"/uploads/{f['storedName']}",
                "uploadedAt": f["uploadedAt"].isoformat() if f.get("uploadedAt") else None
            }
            for f in files
        ]
    }

