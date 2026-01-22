# NovaDo Developer Guide v1.0

> Technical documentation for developers working with NovaDo

**Target Audience**: Developers, Contributors, System Administrators  
**Prerequisites**: Python 3.10+, Basic web development knowledge

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Architecture](#project-architecture)
3. [Development Setup](#development-setup)
4. [Code Structure](#code-structure)
5. [Data Models](#data-models)
6. [Frontend Architecture](#frontend-architecture)
7. [State Management](#state-management)
8. [API Integration](#api-integration)
9. [Testing](#testing)
10. [Debugging](#debugging)
11. [Building & Deployment](#building--deployment)
12. [Contributing](#contributing)

---

## Getting Started

### Quick Setup

```bash
# Clone repository
git clone https://github.com/amnxlab/NovaDo.git
cd NovaDo

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp env.example .env

# Run development server
python main.py
```

Server runs at `http://localhost:5000`

---

## Project Architecture

### Tech Stack

**Backend**:
- FastAPI (Python 3.10+)
- Mongita (Embedded MongoDB)
- JWT Authentication
- Pydantic validation

**Frontend**:
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Lucide Icons
- No framework dependencies

**Deployment**:
- PyInstaller (Windows executable)
- Nginx (Production web server)

### Architecture Pattern

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────┐
│   FastAPI   │
│  (Backend)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Mongita   │
│  (Database) │
└─────────────┘
```

---

## Development Setup

### Environment Variables

Create `.env` file:

```ini
# Database
DATABASE_NAME=taskflow
DATABASE_PATH=./data

# Security
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=168

# AI Providers (optional)
GEMINI_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY=

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

# Notifications (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CONTACT_EMAIL=

# Server
HOST=0.0.0.0
PORT=5000
RELOAD=True
```

### Install Development Tools

```bash
# Code formatting
pip install black

# Linting
pip install flake8 pylint

# Testing
pip install pytest pytest-asyncio httpx

# Type checking
pip install mypy
```

---

## Code Structure

```
NovaDo/
├── app/                          # Backend application
│   ├── __init__.py
│   ├── auth.py                   # JWT authentication
│   ├── database.py               # Database connection
│   ├── models.py                 # Pydantic models
│   └── routes/                   # API endpoints
│       ├── __init__.py
│       ├── auth.py               # Auth endpoints
│       ├── tasks.py              # Task CRUD
│       ├── lists.py              # List management
│       ├── tags.py               # Tag hierarchy
│       ├── habits.py             # Habit tracking
│       ├── focus.py              # Pomodoro sessions
│       ├── stats.py              # Statistics
│       ├── llm.py                # AI integration
│       ├── calendar.py           # Google Calendar
│       ├── user.py               # User preferences
│       ├── notifications.py      # Push notifications
│       ├── uploads.py            # File uploads
│       └── banner.py             # Banner management
│
├── static/                       # Frontend assets
│   ├── index.html                # Main HTML
│   ├── sw.js                     # Service worker
│   ├── css/
│   │   ├── style.css             # Main styles
│   │   ├── taskMatrix.css        # Matrix view
│   │   └── themes.css            # Theme definitions
│   └── js/
│       ├── app.js                # Main application
│       ├── api.js                # API client
│       ├── taskMatrix.js         # Matrix logic
│       ├── statistics.js         # Stats charts
│       ├── stats.js              # Stats utilities
│       └── notifications.js      # Push notifications
│
├── data/                         # Database storage
├── uploads/                      # User uploads
│   ├── avatars/
│   ├── banners/
│   └── files/
│
├── tests/                        # Test suite
│   ├── __init__.py
│   └── test_banner_properties.py
│
├── docs/                         # Documentation
│   ├── FEATURES.md
│   ├── API_REFERENCE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── architecture/
│   ├── deployment/
│   └── features/
│
├── main.py                       # Application entry
├── launcher_gui.py               # GUI launcher
├── build.py                      # Build script
├── requirements.txt              # Python dependencies
├── NovaDo.spec                   # PyInstaller config
└── README.md                     # Project readme
```

---

## Data Models

### Task Model

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    list: Optional[str] = None
    dueDate: Optional[datetime] = None
    dueTime: Optional[str] = None
    priority: str = "none"  # none, low, medium, high
    tags: List[str] = []
    subtasks: List[dict] = []
    attachments: List[dict] = []
    recurrence: Optional[dict] = None
    reminders: List[datetime] = []
```

### User Model

```python
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserResponse(BaseModel):
    _id: str
    email: str
    name: str
    avatar: Optional[str] = None
    preferences: dict = {}
    stats: dict = {}
```

### List Model

```python
class ListCreate(BaseModel):
    name: str
    color: str = "#1890ff"
    icon: str = "list"
    parent: Optional[str] = None
```

### Tag Model

```python
class TagCreate(BaseModel):
    name: str
    color: str = "#666666"
    parent: Optional[str] = None
```

### Habit Model

```python
class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    frequency: str = "daily"  # daily, weekly, monthly
    targetDays: List[int] = []
    targetCount: int = 1
    color: str = "#52c41a"
    icon: str = "check-circle"
    reminder: Optional[dict] = None
```

---

## Frontend Architecture

### Application State

```javascript
const state = {
    user: null,              // Current user object
    tasks: [],               // All tasks
    lists: [],               // Custom lists
    habits: [],              // Habit definitions
    tags: [],                // Hierarchical tags
    currentView: 'inbox',    // Active view
    currentList: null,       // Selected list ID
    currentTag: null,        // Selected tag
    calendarDate: new Date(),// Calendar focus date
    calendarViewMode: 'month'// Calendar view type
};
```

### Module Structure

**app.js** - Main application logic
- User authentication
- Task management
- List & tag operations
- Calendar rendering
- Habit tracking
- View switching

**api.js** - API client wrapper
- HTTP request handling
- Token management
- Error handling
- Response normalization

**taskMatrix.js** - Task Matrix view
- Eisenhower matrix
- Kanban board
- List view
- Drag & drop
- Banner management

**statistics.js** - Analytics
- Chart rendering
- Data aggregation
- Trend analysis

**notifications.js** - Push notifications
- Service worker registration
- Subscription management
- Notification display

---

## State Management

### Global State

State is stored in the `state` object and updated via functions:

```javascript
// Update state
function updateState(updates) {
    Object.assign(state, updates);
    renderCurrentView();
}

// Add task to state
function addTask(task) {
    state.tasks.push(task);
    renderCurrentView();
    updateCounts();
}

// Remove task from state
function removeTask(taskId) {
    state.tasks = state.tasks.filter(t => t._id !== taskId);
    renderCurrentView();
    updateCounts();
}
```

### Local Storage

User preferences persisted:

```javascript
// Save theme
localStorage.setItem('theme', 'dark');

// Get theme
const theme = localStorage.getItem('theme') || 'dark';

// Save token
localStorage.setItem('token', jwt_token);
```

---

## API Integration

### API Client Usage

```javascript
// Initialize
const api = new API();
api.setToken(localStorage.getItem('token'));

// Tasks
const tasks = await api.getTasks();
const task = await api.createTask(taskData);
await api.updateTask(taskId, updates);
await api.deleteTask(taskId);

// Lists
const lists = await api.getLists();
const list = await api.createList(listData);

// Tags
const tags = await api.getTags();
const tag = await api.createTag(tagData);

// Habits
const habits = await api.getHabits();
await api.completeHabit(habitId, date);

// AI
const parsed = await api.parseNaturalLanguage(text);
const response = await api.chatWithAI(message);

// Calendar
const url = await api.getGoogleOAuthUrl();
const calendars = await api.getGoogleCalendars();
await api.importGoogleEvents(calendarIds, start, end);

// Statistics
const stats = await api.getStatistics();
```

### Error Handling

```javascript
try {
    const task = await api.createTask(data);
    showToast('Task created successfully');
} catch (error) {
    console.error('Failed to create task:', error);
    showToast('Failed to create task', 'error');
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_banner_properties.py

# Run with coverage
pytest --cov=app tests/

# Run with verbose output
pytest -v
```

### Writing Tests

```python
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_task():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register user
        response = await client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "testpass123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Create task
        response = await client.post("/api/tasks", 
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Test Task"}
        )
        assert response.status_code == 201
        assert response.json()["task"]["title"] == "Test Task"
```

---

## Debugging

### Backend Debugging

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Print variables
print(f"Task: {task}")

# Use debugger
import pdb; pdb.set_trace()
```

### Frontend Debugging

```javascript
// Console logging
console.log('State:', state);
console.table(tasks);

// Debugger
debugger;

// Performance monitoring
console.time('renderTasks');
renderTasks();
console.timeEnd('renderTasks');
```

### Network Debugging

Chrome DevTools > Network tab
- Inspect requests/responses
- Check headers
- View timing
- Monitor WebSocket

---

## Building & Deployment

### Build Executable (Windows)

```bash
# Install PyInstaller
pip install pyinstaller

# Build
python build.py

# Output in dist/NovaDo/
```

### Production Deployment

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or use systemd service
sudo cp novado.service /etc/systemd/system/
sudo systemctl enable novado
sudo systemctl start novado
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name novado.app;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static {
        alias /var/www/novado/static;
    }

    location /uploads {
        alias /var/www/novado/uploads;
    }
}
```

---

## Contributing

### Code Style

**Python**:
- Follow PEP 8
- Use Black formatter
- Type hints preferred
- Docstrings for public functions

```python
def calculate_streak(completions: List[dict]) -> int:
    """Calculate current streak from completion history.
    
    Args:
        completions: List of completion dicts with 'date' key
        
    Returns:
        Current streak count
    """
    # Implementation
```

**JavaScript**:
- Use ES6+ features
- camelCase naming
- JSDoc comments for complex functions
- Async/await for promises

```javascript
/**
 * Fetch tasks from API with optional filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Array of tasks
 */
async function fetchTasks(filters = {}) {
    // Implementation
}
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "Add amazing feature"

# Push to GitHub
git push origin feature/amazing-feature

# Create Pull Request on GitHub
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log() in production code
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

---

## Common Tasks

### Add New API Endpoint

1. Create route in `app/routes/`
2. Add model in `app/models.py`
3. Register router in `main.py`
4. Add client method in `static/js/api.js`
5. Update documentation

### Add New Theme

1. Add theme to `static/css/themes.css`
2. Update theme list in `static/js/app.js`
3. Test all UI components

### Add New View

1. Add HTML in `static/index.html`
2. Add styles in `static/css/style.css`
3. Add logic in `static/js/app.js`
4. Update navigation

---

## Troubleshooting

### Database Issues

```bash
# Reset database
rm -rf data/

# Restart server (DB will recreate)
python main.py
```

### Build Issues

```bash
# Clear build cache
rm -rf build/ dist/

# Rebuild
python build.py
```

### Port Already in Use

```bash
# Find process
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Linux/Mac)
kill -9 <PID>
```

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Mongita Documentation](https://github.com/scottrogowski/mongita)
- [Lucide Icons](https://lucide.dev/)
- [PyInstaller Manual](https://pyinstaller.org/)

---

**Version**: 1.0.0  
**Last Updated**: January 21, 2026  
**Maintainer**: Ahmed Amin
