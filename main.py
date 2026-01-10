"""
NovaDo - FastAPI Backend Server
Main application entry point
"""
import os
from dotenv import load_dotenv

# Load environment variables FIRST, before any other imports
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from contextlib import asynccontextmanager

from app.database import connect_db, close_db
from app.routes import auth, tasks, lists, habits, calendar, llm, user, pomodoro, stats, uploads, notifications

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


def kill_port_process(port: int):
    """Kill any process running on the specified port"""
    import subprocess
    import platform
    import time
    
    try:
        if platform.system() == "Windows":
            # Find ALL processes using the port (including children)
            result = subprocess.run(
                f'netstat -ano | findstr :{port}',
                shell=True, capture_output=True, text=True
            )
            if result.stdout:
                pids = set()
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        pids.add(pid)
                
                # Kill all found PIDs
                for pid in pids:
                    try:
                        subprocess.run(f'taskkill /PID {pid} /F /T', shell=True, capture_output=True)
                        print(f"  Killed process on port {port} (PID: {pid})")
                    except:
                        pass
                
                # Wait a bit and do a second pass to ensure cleanup
                time.sleep(0.5)
                result2 = subprocess.run(
                    f'netstat -ano | findstr :{port}',
                    shell=True, capture_output=True, text=True
                )
                if result2.stdout:
                    for line in result2.stdout.strip().split('\n'):
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            subprocess.run(f'taskkill /PID {pid} /F /T', shell=True, capture_output=True)
        else:
            # Unix/Mac
            result = subprocess.run(
                f'lsof -ti:{port}',
                shell=True, capture_output=True, text=True
            )
            if result.stdout:
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        subprocess.run(f'kill -9 {pid}', shell=True)
                        print(f"  Killed existing process on port {port} (PID: {pid})")
    except Exception as e:
        print(f"  Warning: Could not check for existing processes: {e}")


if __name__ == "__main__":
    import signal
    import sys
    import atexit
    import psutil
    
    main_process_pid = None
    
    def kill_all_related_processes():
        """Kill ALL processes related to this app"""
        import subprocess
        import time
        
        port = int(os.getenv("PORT", 5000))
        print("\n  ⚠️  KILLING ALL PROCESSES...")
        
        # 1. Kill by port
        kill_port_process(port)
        
        # 2. Kill all uvicorn processes
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'uvicorn' in cmdline.lower() or 'main:app' in cmdline:
                        print(f"  Killing uvicorn process: {proc.info['pid']}")
                        proc.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except:
            pass
        
        # 3. Kill main process and all children
        if main_process_pid:
            try:
                parent = psutil.Process(main_process_pid)
                children = parent.children(recursive=True)
                for child in children:
                    try:
                        child.kill()
                        print(f"  Killed child process: {child.pid}")
                    except:
                        pass
            except:
                pass
        
        # 4. Final port cleanup
        time.sleep(0.5)
        kill_port_process(port)
        print("  ✓ Cleanup complete\n")
    
    def signal_handler(sig, frame):
        """Handle Ctrl+C"""
        print("\n\n  🛑 SHUTDOWN SIGNAL RECEIVED...")
        kill_all_related_processes()
        sys.exit(0)
    
    # Register cleanup handlers
    atexit.register(kill_all_related_processes)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Initial cleanup
    port = int(os.getenv("PORT", 5000))
    kill_port_process(port)
    
    print(f"\n  🚀 NovaDo is running!")
    print(f"  🌐 Open http://localhost:{port} in your browser")
    print(f"  ⚠️  Press Ctrl+C to stop (will kill ALL processes)\n")
    
    try:
        import multiprocessing
        main_process_pid = multiprocessing.current_process().pid
        
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"\n  ❌ Error: {e}")
    finally:
        kill_all_related_processes()

