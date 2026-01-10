# NovaDo
**A smart, AI-powered task management application with seamless Google Calendar integration.**

NovaDo allows you to organize your life with ease, offering intelligent task creation, habit tracking, and two-way calendar synchronization. Built with a robust FastAPI backend and a responsive vanilla JavaScript frontend.

![NovaDo Logo](logo.png)

## 🌟 Key Features

*   **🤖 AI Assistant**: Create tasks using natural language ("Remind me to buy milk tomorrow at 5pm"). Supports Google Gemini and Groq.
*   **📅 Google Calendar Sync**: Two-way synchronization. Import events as tasks, or view tasks on your calendar.
*   **✅ Smart Task Management**: Organize with lists, tags, priorities, and smart filters (Today, Next 7 Days).
*   **🔥 Habit Tracking**: Keep your streaks alive with a dedicated habit tracker.
*   **🌗 Adaptive UI**: Beautiful Light and Dark modes.
*   **🔒 Privacy First**: Works with a local database (Mongita) by default, data stays yours.

## 🚀 Getting Started

Quick start guide to get NovaDo running on your machine.

### Prerequisites
*   Python 3.10+
*   pip

### Installation

1.  **Clone and Setup**:
    ```bash
    git clone https://github.com/yourusername/Planner.git
    cd Planner
    python -m venv venv
    # Windows:
    .\venv\Scripts\Activate.ps1
    # Mac/Linux:
    source venv/bin/activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run**:
    ```bash
    python main.py
    ```
    Access at `http://localhost:5000`.

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

-   **[Deployment Guide](docs/deployment/README.md)**: Detailed setup, environment variables, and production deployment.
-   **[Board Architecture](docs/architecture/README.md)**: Understanding the backend and frontend structure.
-   **[Feature Guides](docs/features/)**: Deep dives into specific features like [Calendar Drag-and-Drop](docs/features/calendar_drag_drop.md).

## 🛠️ Project Structure

The project is organized as follows:
-   `app/`: FastAPI application (Routes, Models, Auth).
-   `static/`: Frontend assets (HTML, CSS, JS).
-   `scripts/`: Utility and maintenance scripts.
-   `docs/`: Comprehensive project documentation.
-   `data/`: Local database storage.

## 🤝 Contributing
Contributions are welcome! Please check the issues tab.

## 📄 License
MIT License.
