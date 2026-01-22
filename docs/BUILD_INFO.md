# NovaDo Run Configuration

Last Updated: January 21, 2026

## Running NovaDo

NovaDo runs directly from source using the GUI Launcher. No build process required.

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run with GUI launcher (recommended)
python launcher_gui.py

# Or run directly
python main.py
```

### GUI Launcher Features

The [launcher_gui.py](../launcher_gui.py) provides:

| Feature | Description |
|---------|-------------|
| **Server Management** | Starts uvicorn server on port 5000 |
| **Port Cleanup** | Kills any existing process on port 5000 before starting |
| **Auto-Browser Open** | Opens browser to `http://localhost:5000` when ready |
| **Directory Setup** | Creates `uploads/` and `data/` directories |
| **Environment Loading** | Loads `.env` via `python-dotenv` |
| **Status Display** | Visual indicator showing server state |
| **URL Copy** | One-click copy server URL to clipboard |

### Server States

- 🟡 **Starting** - Yellow pulsing dot, "Starting server..."
- 🟢 **Running** - Green dot, "Server is running"
- 🔴 **Failed** - Red dot, "Failed to start"

---

## Complete API Endpoint List

### Authentication (`/api/auth`)
- POST /register
- POST /login
- POST /logout
- GET /google/authorize
- GET /google/callback

### Tasks (`/api/tasks`)
- GET / - List tasks
- POST / - Create task
- GET /{task_id}
- PUT /{task_id}
- DELETE /{task_id}
- GET /matrix - Eisenhower Matrix
- POST /ai-prioritize

### Lists (`/api/lists`)
- GET /
- POST /
- PUT /{list_id}
- DELETE /{list_id}

### Habits (`/api/habits`)
- GET /
- POST /
- POST /{habit_id}/complete
- GET /{habit_id}/streak

### Calendar (`/api/calendar`)
- GET /events
- POST /sync
- POST /create

### Tags (`/api/tags`)
- GET /
- POST /
- PUT /{tag_id}
- DELETE /{tag_id}

### Statistics (`/api/stats`)
- GET /overview
- GET /productivity
- GET /habits

### User (`/api/user`)
- GET /profile
- PUT /profile
- PUT /preferences

### Banner (`/api/user/banner`)
- POST /
- DELETE /

### Pomodoro (`/api/pomodoro`)
- POST /start
- POST /stop
- GET /stats

### Focus (`/api/focus`)
- POST /mode
- GET /settings

### Notifications (`/api/notifications`)
- GET /
- POST /mark-read
- DELETE /{notification_id}

### LLM (`/api/llm`)
- POST /suggest
- POST /analyze

### Uploads (`/api/uploads`)
- POST /banner

---

## Frontend Files

### JavaScript (6 files)
1. **api.js** - API client with fetch wrappers
2. **app.js** - Main application logic and UI
3. **notifications.js** - Notification system
4. **statistics.js** - Charts and analytics
5. **stats.js** - Statistics helpers
6. **taskMatrix.js** - Matrix view implementation

### CSS (3 files)
1. **style.css** - Main application styles
2. **taskMatrix.css** - Eisenhower Matrix specific styles
3. **themes.css** - Theme system (light/dark/custom)

### HTML (2 files)
1. **index.html** - Main SPA page
2. **sw.js** - Service worker for PWA

---

## Backend Files

### Core (5 files)
1. **main.py** - FastAPI server entry point
2. **launcher_gui.py** - GUI launcher
3. **app/auth.py** - JWT authentication & OAuth
4. **app/database.py** - Mongita database
5. **app/models.py** - Pydantic models
6. **app/scheduler.py** - Background scheduler

### Routes (14 files)
All in `app/routes/`:
1. auth.py
2. tasks.py
3. lists.py
4. habits.py
5. calendar.py
6. llm.py
7. user.py
8. pomodoro.py
9. stats.py
10. uploads.py
11. notifications.py
12. focus.py
13. banner.py
14. tags.py

---

## Project Structure

```
NovaDo/
├── main.py              # FastAPI server entry point
├── launcher_gui.py      # GUI launcher (recommended)
├── requirements.txt     # Python dependencies
├── .env                 # Configuration (from env.example)
├── uploads/
│   └── banners/         # User banners
├── data/                # Mongita database
│   ├── taskflow.tasks/
│   ├── taskflow.users/
│   ├── taskflow.habits/
│   ├── taskflow.lists/
│   └── taskflow.tags/
├── static/              # Frontend
│   ├── index.html
│   ├── sw.js
│   ├── css/
│   │   ├── style.css
│   │   ├── taskMatrix.css
│   │   └── themes.css
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── notifications.js
│   │   ├── statistics.js
│   │   ├── stats.js
│   │   └── taskMatrix.js
│   └── logos/
│       ├── novado.png
│       └── novado.ico
├── app/
│   ├── __init__.py
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── scheduler.py
│   └── routes/
│       └── (14 route modules)
├── docs/
│   ├── API_REFERENCE.md
│   ├── BUILD_INFO.md
│   ├── FEATURES.md
│   └── ...
└── tests/
    └── ...
```

---

## Requirements

- Python 3.10+
- All dependencies in requirements.txt
- Windows / Linux / macOS

## Tech Stack

**Backend:**
- FastAPI (Web framework)
- Mongita (Embedded database)
- APScheduler (Background tasks)
- PyJWT (Authentication)
- Passlib (Password hashing)

**Frontend:**
- Vanilla JavaScript (No framework)
- CSS3 (Modern responsive design)
- Service Worker (PWA support)

---

© 2026 Ahmed Amin
