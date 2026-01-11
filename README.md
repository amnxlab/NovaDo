# NovaDo v0.5

**Smart Task Management with AI & Google Calendar Integration**

![NovaDo](banner.png)

---

## ✨ Features

- **🤖 AI Assistant** – Create tasks with natural language ("Meeting with John tomorrow at 3pm")
- **📅 Google Calendar Sync** – Two-way sync with multiple calendars
- **✅ Smart Task Management** – Lists, tags, priorities, smart filters
- **📊 Task Matrix** – Eisenhower Matrix for prioritization
- **🔥 Habit Tracking** – Build streaks and track progress
- **🍅 Pomodoro Timer** – Focus mode with break reminders
- **📈 Statistics** – Productivity insights and analytics
- **🌙 Dark Mode** – Beautiful dark and light themes
- **🔒 Local Storage** – Your data stays on your machine

---

## 🚀 Quick Start

### Option 1: Run the Executable (Windows)
1. Download `app-release` folder
2. Double-click `NovaDo.exe`
3. App opens automatically at `http://localhost:5000`

### Option 2: Run from Source
```bash
# Clone & setup
git clone https://github.com/amnxlab/NovaDo.git
cd NovaDo
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt

# Run
python launcher_gui.py  # GUI launcher
# or
python main.py          # Direct server
```

---

## ⚙️ Configuration

Edit `.env` file for optional features:

```ini
# AI Assistant (choose one)
GEMINI_API_KEY=your-key          # Google Gemini (free)
GROQ_API_KEY=your-key            # Groq (free)

# Google Calendar Sync
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

# Security
SECRET_KEY=change-this-in-production
JWT_SECRET_KEY=change-this-too
```

---

## 📁 Project Structure

```
NovaDo/
├── app/                 # FastAPI backend
│   ├── routes/          # API endpoints
│   ├── models/          # Data models
│   └── auth.py          # Authentication
├── static/              # Frontend (HTML/CSS/JS)
│   ├── css/             # Stylesheets
│   └── js/              # Application logic
├── launcher_gui.py      # Desktop app launcher
├── main.py              # Server entry point
├── data/                # Local database
└── uploads/             # User uploads
```

---

## 🔧 Requirements

- **Python 3.10+** (for source)
- **Windows 10+** (for executable)
- Internet connection (for Google Calendar & AI features)

---

## 📝 Changelog v0.5

- ✅ Desktop GUI launcher with dark mode
- ✅ Google Calendar multi-calendar sync
- ✅ Timezone-aware event handling
- ✅ Task Matrix (Eisenhower) view
- ✅ Pomodoro timer with statistics
- ✅ Profile picture upload
- ✅ Kanban board view
- ✅ Calendar drag & drop

---

## 👤 Author

**Ahmed Amin**  
[amnxlab.site](https://amnxlab.site) • [GitHub](https://github.com/amnxlab)

---

## 📄 License

MIT License © 2026 Ahmed Amin
