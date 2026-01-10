# Architecture Overview

NovaDo is a full-stack task management application designed for simplicity and performance. It follows a classic client-server architecture.

## 🏗️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python) - High performance, easy to use.
- **Database**: 
    - **Default**: [Mongita](https://github.com/scottrogowski/mongita) (Embedded MongoDB-like database) for zero-config local storage.
    - **Production**: Supports standard MongoDB.
- **Authentication**: JWT (JSON Web Tokens).

### Frontend
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Styling**: Custom CSS with CSS Variables for theming (Light/Dark/Hacker modes).
- **Icons**: FontAwesome.
- **Interactivity**: Drag-and-drop API, native DOM manipulation.

## 📂 Project Structure

```
Planner/
├── app/                  # Backend Logic
│   ├── routes/           # API Endpoints (Tasks, Lists, Auth, etc.)
│   ├── models.py         # Pydantic Data Models
│   ├── database.py       # DB Connection Logic
│   └── auth.py           # JWT Handling
├── static/               # Frontend Assets
│   ├── js/               # JavaScript Modules
│   │   ├── app.js        # Main UI Logic
│   │   └── api.js        # API Client Wrapper
│   └── css/              # Stylesheets
│       └── styles.css    # Global Variables & Components
├── data/                 # Local Database Support (Mongita)
├── docs/                 # Documentation
└── scripts/              # Maintenance Scripts
```

## 🔄 Data Flow

1.  **User Action**: User interacts with the UI (e.g., drags a task to a new date).
2.  **Frontend Update**: JS immediately updates the DOM for responsiveness.
3.  **API Call**: `api.js` sends a request (e.g., `PUT /api/tasks/{id}`) to the FastAPI backend.
4.  **Backend Processing**:
    - Route handler receives request.
    - Validates data using Pydantic models.
    - Updates database via `database.py`.
5.  **Response**: Server returns updated data or confirmation.
6.  **Sync**: If connected, background tasks may sync with Google Calendar.

## 🔌 API Design

The API is RESTful:
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Remove task

Swagger documentation is auto-generated at `/docs` when the server is running.
