# Deployment Guide

This guide covers how to set up NovaDo for local development and production usage.

## 📦 Prerequisites

Ensure you have the following installed:
- **Python**: Version 3.10 or higher.
- **pip**: Python package installer.
- **Git**: For version control.

## 🛠️ Local Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Planner.git
cd Planner
```

### 2. Set Up Virtual Environment

It is recommended to use a virtual environment to manage dependencies.

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configuration

Create a `.env` file in the root directory. You can use the provided `env.example` as a template.

```env
# Server Configuration
PORT=5000
HOST=0.0.0.0

# Database
# If not provided, Mongita (local file-based DB) is used.
MONGODB_URI=mongodb://localhost:27017/taskflow

# Security
JWT_SECRET=your_super_secret_key_here

# Third-Party Integrations (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
OPENAI_API_KEY=your_openai_api_key_or_gemini_key
```

### 5. Running the Application

Start the server using:

```bash
python main.py
```

Or using `uvicorn` directly for development (with auto-reload):

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

## 🚀 Production Deployment

For production, it is recommended to use a process manager like **Gunicorn** (Linux/Mac) or run behind a reverse proxy like **Nginx**.

### Using Gunicorn (Linux/Mac)
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Windows Production
For Windows, you can run `uvicorn` as a service or use a process manager like `NSSM`.

## 💾 Database Migration

NovaDo uses **Mongita** by default, which stores data in JSON files within the `data/` directory. No complex migration is needed. If you switch to a real MongoDB instance, simply update the `MONGODB_URI` in `.env`.
