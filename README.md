# NovaDo

A smart task management application with AI integration and Google Calendar sync, built with FastAPI (Python) and vanilla JavaScript.

## Features

- **Task Management**: Create, edit, delete, and organize tasks with priorities, due dates, and tags
- **Smart Lists**: Automatic filtering for Inbox, Today, Next 7 Days, and Completed tasks
- **Custom Lists**: Create your own lists with custom colors
- **Habit Tracking**: Track daily habits with streak counting
- **Calendar View**: Visualize tasks on a monthly calendar
- **🤖 AI Assistant**: Natural language task creation with FREE options (Google Gemini, Groq)
- **Dark/Light Theme**: Toggle between themes
- **Local Database**: Works offline with Mongita (file-based database)

## Prerequisites

- **Python 3.10+** (tested with Python 3.14)
- **pip** (Python package manager)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Planner.git
cd Planner
```

### 2. Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment (Optional)

Create a `.env` file in the project root:

```env
# Server settings
PORT=5000

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-key-change-this

# MongoDB (optional - app uses local Mongita if not available)
MONGODB_URI=mongodb://localhost:27017/taskflow

# Google OAuth (optional - for calendar sync)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OpenAI (optional - for AI features)
OPENAI_API_KEY=your-openai-api-key
```

## Running the Application

### Start the Server

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

### Access the Application

Open your browser and navigate to:

```
http://localhost:5000
```

## Usage

### First Time Setup

1. Open the application in your browser
2. Click the **Register** tab
3. Enter your name, email, and password
4. Click **Register** to create your account
5. You'll be automatically logged in

### Creating Tasks

1. Click the **+ New Task** button
2. Enter a title (required)
3. Optionally add:
   - Description
   - Due date and time
   - Priority (None, Low, Medium, High)
   - List assignment
   - Tags (comma-separated)
4. Click **Save Task**

### Managing Lists

1. Click **+ New List** in the sidebar
2. Enter a name and choose a color
3. Click **Create List**
4. Tasks can be assigned to your custom lists

### Tracking Habits

1. Click **Habits** in the sidebar
2. Click **+ New Habit**
3. Enter the habit name and frequency
4. Click the day circles to mark habits as complete

### AI Assistant (Free Options Available!)

NovaDo includes an AI assistant that lets you create tasks using natural language. Click the **🤖 floating button** in the bottom-right corner to start chatting!

**Example commands:**
- "Remind me to call mom tomorrow at 3pm"
- "Create an urgent task to review the quarterly report"
- "Add a task to buy groceries with low priority"

#### Setting Up AI (Choose a Free Provider)

1. Go to **Settings** (gear icon)
2. Under **AI Assistant**, select a provider:

| Provider | Free Tier | How to Get API Key |
|----------|-----------|-------------------|
| **Google Gemini** ⭐ | Yes, generous limits | Visit [ai.google.dev](https://ai.google.dev) → Get API Key |
| **Groq (Llama)** ⚡ | Yes, fast inference | Visit [console.groq.com](https://console.groq.com) → Create API Key |
| OpenAI | No (paid only) | Visit [platform.openai.com](https://platform.openai.com) |

3. Paste your API key
4. Click **Configure AI**

**Recommended:** Start with **Google Gemini** - it's free and works great!

## Project Structure

```
Planner/
├── main.py              # FastAPI application entry point
├── requirements.txt     # Python dependencies
├── .env                 # Environment configuration (create this)
├── app/
│   ├── auth.py          # Authentication utilities
│   ├── database.py      # Database connection (MongoDB/Mongita)
│   ├── models.py        # Pydantic models
│   └── routes/          # API route handlers
│       ├── auth.py      # Authentication routes
│       ├── tasks.py     # Task CRUD routes
│       ├── lists.py     # List management routes
│       ├── habits.py    # Habit tracking routes
│       ├── calendar.py  # Calendar integration
│       ├── llm.py       # AI/LLM routes
│       └── user.py      # User settings routes
├── static/
│   ├── index.html       # Main HTML page
│   ├── css/
│   │   └── styles.css   # Application styles
│   └── js/
│       ├── api.js       # API client
│       └── app.js       # Frontend application logic
├── data/                # Local database storage (auto-created)
└── uploads/             # File uploads (auto-created)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks/` - Get all tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}` - Get single task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Lists
- `GET /api/lists/` - Get all lists
- `POST /api/lists/` - Create list
- `PUT /api/lists/{id}` - Update list
- `DELETE /api/lists/{id}` - Delete list

### Habits
- `GET /api/habits/` - Get all habits
- `POST /api/habits/` - Create habit
- `POST /api/habits/{id}/complete` - Mark habit complete
- `DELETE /api/habits/{id}` - Delete habit

### Health Check
- `GET /api/health` - Server health status

## Troubleshooting

### Port Already in Use

If port 5000 is busy, use a different port:

```bash
uvicorn main:app --host 0.0.0.0 --port 5001
```

### Database Issues

The app automatically falls back to Mongita (local file-based database) if MongoDB is not available. Data is stored in the `data/` directory.

To reset the database, delete the `data/` folder and restart the server.

### Windows Encoding Errors

If you see Unicode encoding errors on Windows, ensure your terminal supports UTF-8 or the issue has been resolved in the latest version.

## Development

### Running in Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The `--reload` flag enables auto-reload when code changes.

### API Documentation

FastAPI provides automatic API documentation:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## License

MIT License - feel free to use this project for learning or building your own applications.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
