"""
NovaDo - FastAPI Backend Server
Main application entry point
"""
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import uvicorn
from contextlib import asynccontextmanager

from app.database import connect_db, close_db
from app.routes import auth, tasks, lists, habits, calendar, llm, user, pomodoro, stats, uploads, notifications

# Load environment variables
load_dotenv()

# Create directories if they don't exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("static", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    await connect_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="NovaDo API",
    description="Smart Task Management API with AI and Google Calendar Integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers first (before static files)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(lists.router, prefix="/api/lists", tags=["Lists"])
app.include_router(habits.router, prefix="/api/habits", tags=["Habits"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(llm.router, prefix="/api/llm", tags=["LLM"])
app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["Pomodoro"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["Uploads"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "NovaDo API is running"
    }


# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/css", StaticFiles(directory="static/css"), name="css")
app.mount("/js", StaticFiles(directory="static/js"), name="js")


@app.get("/")
async def serve_index():
    """Serve the main frontend page"""
    return FileResponse("static/index.html")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve static files or fall back to index.html for SPA routing"""
    # Check if file exists in static directory
    file_path = f"static/{full_path}"
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # Fall back to index.html for SPA routing
    return FileResponse("static/index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"\n  NovaDo is running!")
    print(f"  Open http://localhost:{port} in your browser\n")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )

