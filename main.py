"""
NovaDo - FastAPI Backend Server
Main application entry point
"""
import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Handle PyInstaller frozen executable - define paths early for logging
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    _BASE_DIR = Path(sys._MEIPASS)
    _WORK_DIR = Path(os.path.dirname(sys.executable))
else:
    # Running as script
    _BASE_DIR = Path(__file__).parent
    _WORK_DIR = _BASE_DIR

# Configure logging FIRST - with file handler for release builds
from logging.handlers import RotatingFileHandler

# Create logs directory in work directory
log_dir = _WORK_DIR / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "backend.log"

# Create handlers
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# File handler with rotation (max 5MB, keep 3 backups)
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=5 * 1024 * 1024,  # 5 MB
    backupCount=3,
    encoding='utf-8'
)
# File handler also at INFO level - DEBUG exposes sensitive OAuth tokens
file_handler.setLevel(logging.INFO)

# Create formatter
log_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(log_formatter)
file_handler.setFormatter(log_formatter)

# Configure root logger
logging.basicConfig(
    level=logging.INFO,  # INFO level to avoid sensitive data exposure
    handlers=[console_handler, file_handler]
)

# SECURITY: Suppress verbose logging from OAuth/HTTP libraries that expose tokens
# These libraries log full HTTP requests/responses at DEBUG including secrets
sensitive_loggers = [
    'requests_oauthlib',      # Logs OAuth tokens and client secrets
    'urllib3',                # Logs full HTTP request/response bodies
    'googleapiclient',        # Logs API request details
    'google.auth',            # Logs auth tokens
    'oauthlib',               # Logs OAuth flow details
    'httplib2',               # Logs HTTP details
    'asyncio',                # Verbose async debug messages
]
for logger_name in sensitive_loggers:
    logging.getLogger(logger_name).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
logger.info(f"Logging initialized - Log file: {log_file}")


# Use the paths defined earlier for logging
BASE_DIR = _BASE_DIR
WORK_DIR = _WORK_DIR

# Change to work directory
os.chdir(WORK_DIR)

# Load environment variables FIRST, before any other imports
# Explicitly load .env from WORK_DIR (where the exe resides)
env_path = WORK_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"[ENV] Loaded .env from: {env_path}")
else:
    # Fallback to default load_dotenv behavior
    load_dotenv()
    print(f"[ENV] Warning: .env not found at {env_path}, using defaults")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from contextlib import asynccontextmanager

from app.database import connect_db, close_db
from app.routes import auth, tasks, lists, habits, calendar, llm, user, pomodoro, stats, uploads, notifications, focus, banner, tags
from app.scheduler import start_scheduler, stop_scheduler

# Create directories if they don't exist (in work directory)
os.makedirs(WORK_DIR / "uploads", exist_ok=True)
os.makedirs(WORK_DIR / "data", exist_ok=True)

# Static directory is in BASE_DIR (bundled with app)
STATIC_DIR = BASE_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    try:
        # Startup
        print("[LIFESPAN] Starting database connection...")
        await connect_db()
        print("[LIFESPAN] Database connected!")
        print("[LIFESPAN] Starting scheduler...")
        await start_scheduler()  # Start background reminder scheduler
        print("[LIFESPAN] Background scheduler started")
        print("[LIFESPAN] Startup complete!")
    except Exception as e:
        import traceback
        print(f"[LIFESPAN ERROR] Startup failed: {e}")
        print(traceback.format_exc())
        # Write to log file
        log_path = WORK_DIR / "startup.log"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"\n[LIFESPAN ERROR] {e}\n{traceback.format_exc()}\n")
        raise
    
    yield
    
    # Shutdown
    await stop_scheduler()
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
app.include_router(focus.router, prefix="/api/focus", tags=["Focus"])
app.include_router(banner.router, prefix="/api/user/banner", tags=["Banner"])
app.include_router(tags.router, prefix="/api/tags", tags=["Tags"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "NovaDo API is running"
    }


# Mount static files using resolved paths
app.mount("/uploads", StaticFiles(directory=str(WORK_DIR / "uploads")), name="uploads")
app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="js")


@app.get("/")
async def serve_index():
    """Serve the main frontend page (SPA)"""
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve static files or fall back to index.html for SPA routing"""
    # Check if file exists in static directory
    file_path = STATIC_DIR / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))
    # Fall back to index.html for SPA routing
    return FileResponse(str(STATIC_DIR / "index.html"))


def kill_port_process(port: int):
    """Kill any process running on the specified port - AGGRESSIVELY"""
    import subprocess
    import platform
    import time
    
    if platform.system() == "Windows":
        try:
            # Use PowerShell for more reliable process killing on Windows
            # Get all PIDs listening on the port
            ps_cmd = f"""
            $pids = (Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | 
                     Where-Object {{ $_.OwningProcess -ne 0 }} | 
                     Select-Object -ExpandProperty OwningProcess -Unique)
            foreach ($pid in $pids) {{
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Killed PID: $pid"
            }}
            """
            subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True)
            
            # Also try netstat approach as backup
            result = subprocess.run(
                f'netstat -ano | findstr :{port}',
                shell=True, capture_output=True, text=True
            )
            if result.stdout:
                pids = set()
                for line in result.stdout.strip().split('\n'):
                    parts = line.split()
                    if len(parts) >= 5 and parts[-1].isdigit() and parts[-1] != '0':
                        pids.add(parts[-1])
                
                for pid in pids:
                    try:
                        # Use /T to kill entire process tree
                        subprocess.run(f'taskkill /PID {pid} /F /T', shell=True, capture_output=True)
                        print(f"  Killed process {pid}")
                    except:
                        pass
            
            # Small delay then verify
            time.sleep(0.3)
            
        except Exception as e:
            print(f"  Warning: Cleanup error: {e}")
    else:
        # Unix/Mac
        try:
            result = subprocess.run(
                f'lsof -ti:{port}',
                shell=True, capture_output=True, text=True
            )
            if result.stdout:
                for pid in result.stdout.strip().split('\n'):
                    if pid:
                        subprocess.run(f'kill -9 {pid}', shell=True)
                        print(f"  Killed PID: {pid}")
        except Exception as e:
            print(f"  Warning: Cleanup error: {e}")


def kill_all_app_processes(exclude_self=False):
    """Kill ALL processes related to this NovaDo app"""
    import subprocess
    import platform
    import time
    import os
    
    current_pid = os.getpid()
    
    print("\n  🔪 KILLING ALL NOVADO PROCESSES...")
    
    # Ports to clean
    ports = [5000, 3000]  # Main app and any frontend dev server
    
    # 1. Kill by port (this won't kill ourselves since we're not listening yet on startup)
    for port in ports:
        kill_port_process(port)
    
    if platform.system() == "Windows" and not exclude_self:
        try:
            # 2. Kill all Python processes running uvicorn or main:app, EXCEPT ourselves
            ps_cmd = f'''
            $currentPid = {current_pid}
            Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {{
                if ($_.Id -ne $currentPid) {{
                    $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                    if ($cmdline -match "uvicorn|main:app") {{
                        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                        Write-Host "Killed Python process: $($_.Id)"
                    }}
                }}
            }}
            '''
            subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True)
        except:
            pass
    
    # 3. Wait and verify cleanup
    time.sleep(0.3)
    
    # 4. Final pass on ports
    for port in ports:
        kill_port_process(port)
    
    print("  ✅ Cleanup complete\n")


if __name__ == "__main__":
    import signal
    import sys
    import atexit
    
    def signal_handler(sig, frame):
        """Handle Ctrl+C"""
        print("\n\n  🛑 SHUTDOWN SIGNAL RECEIVED...")
        kill_all_app_processes()
        sys.exit(0)
    
    # Register cleanup handlers
    atexit.register(kill_all_app_processes)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Initial cleanup - kill any lingering processes
    print("\n  🧹 Cleaning up any existing processes...")
    kill_all_app_processes()
    
    port = int(os.getenv("PORT", 5000))
    
    print(f"  🚀 NovaDo is running!")
    print(f"  🌐 Open http://localhost:{port} in your browser")
    print(f"  ⚠️  Press Ctrl+C to stop (will kill ALL processes)\n")
    
    try:
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
        kill_all_app_processes()
else:
    # When imported (e.g., by GUI launcher), don't run cleanup on import
    pass

