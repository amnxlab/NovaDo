# TaskFlow - Smart Task Management

A modern task management application with AI-powered task creation, habit tracking, and calendar view. Built with Python (FastAPI) and pure HTML/CSS/JavaScript - **no Node.js required**.

## ✨ Features

- **Task Management** - Create, edit, delete, and organize tasks
- **Smart Lists** - Inbox, Today, Next 7 Days, All, Completed
- **Custom Lists** - Create your own lists with colors
- **Habits Tracker** - Track daily/weekly habits with streaks
- **Calendar View** - Visual task organization by date
- **AI Smart Input** - Natural language task creation (OpenAI/DeepSeek)
- **Dark/Light Theme** - Beautiful dark theme by default
- **Search** - Find tasks quickly
- **Priorities & Tags** - Organize with priorities and tags

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free)

### One Command Start

```bash
python start.py
```

Or on Windows, double-click `start.bat`

The script will:
1. Check Python is installed
2. Create virtual environment
3. Install Python dependencies
4. Create configuration files
5. Start the server
6. Open your browser

### Access

Open http://localhost:5000 in your browser

## 📁 Project Structure

```
TaskFlow/
├── app/                    # Python backend
│   ├── routes/             # API endpoints
│   ├── auth.py             # Authentication
│   ├── database.py         # MongoDB connection
│   └── models.py           # Data models
├── static/                 # Frontend (pure HTML/CSS/JS)
│   ├── css/style.css       # Styles
│   ├── js/api.js           # API client
│   ├── js/app.js           # Application logic
│   └── index.html          # Main page
├── app.py                  # FastAPI server
├── requirements.txt        # Python dependencies
├── start.py                # Start script
└── env.example             # Environment template
```

## ⚙️ Configuration

Copy `env.example` to `.env` and configure:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your-secret-key
```

### MongoDB Atlas (Cloud)

1. Create free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
   ```

### AI Assistant (Optional)

1. Go to Settings in the app
2. Enter your API key:
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com/api-keys)
   - **DeepSeek**: Get from [platform.deepseek.com](https://platform.deepseek.com)
3. Use the Smart Input feature to create tasks with natural language

## 🛠️ Manual Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python app.py
```

## 📚 API Documentation

Interactive API docs available at http://localhost:5000/docs

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/tasks | Get all tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/{id} | Update task |
| DELETE | /api/tasks/{id} | Delete task |
| GET | /api/lists | Get all lists |
| POST | /api/lists | Create list |
| GET | /api/habits | Get all habits |
| POST | /api/habits | Create habit |
| POST | /api/habits/{id}/complete | Mark habit complete |
| POST | /api/llm/parse | Parse natural language task |

## 🎨 Tech Stack

**Backend:**
- Python 3.8+
- FastAPI
- MongoDB with Motor (async)
- JWT Authentication
- OpenAI SDK

**Frontend:**
- Pure HTML5
- CSS3 (CSS Variables, Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- No frameworks, no build step

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- API key encryption
- Input validation

## 📝 License

MIT License

---

**Built with Python and ❤️**
