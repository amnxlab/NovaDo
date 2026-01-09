# TaskFlow - Detailed Setup Guide

This guide provides step-by-step instructions for setting up the TaskFlow application from scratch.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Initial Setup](#initial-setup)
3. [Google OAuth Configuration](#google-oauth-configuration)
4. [MongoDB Setup](#mongodb-setup)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [LLM Configuration](#llm-configuration)
8. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **MongoDB**: v5.0 or higher
- **RAM**: 4GB minimum
- **Disk Space**: 500MB free space

### Recommended
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher
- **RAM**: 8GB or more

### Operating Systems
- Windows 10/11
- macOS 10.15 or higher
- Linux (Ubuntu 20.04+, Debian 10+, etc.)

## Initial Setup

### 1. Install Node.js

#### Windows
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Verify installation:
```bash
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 2. Install MongoDB

#### Windows
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB as a service
5. Verify installation:
```bash
mongod --version
```

#### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0

# Start MongoDB
brew services start mongodb-community@6.0

# Verify
mongosh --version
```

#### Linux (Ubuntu)
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongod --version
```

#### Using Docker (All Platforms)
```bash
# Pull MongoDB image
docker pull mongo:latest

# Run MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Verify
docker ps | grep mongodb
```

### 3. Clone and Install Project

```bash
# Clone repository
git clone <repository-url>
cd Planner

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

## Google OAuth Configuration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "TaskFlow" (or your choice)
4. Click "Create"

### Step 2: Enable APIs

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search and enable:
   - **Google+ API** (for user info)
   - **Google Calendar API** (for calendar sync)

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: TaskFlow
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/calendar`
5. Add test users (your email for testing)
6. Click "Save and Continue"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Name: "TaskFlow Web Client"
5. Add **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost:5000
   ```
6. Add **Authorized redirect URIs**:
   ```
   http://localhost:5000/api/auth/google/callback
   http://localhost:3000/auth/callback
   ```
7. Click "Create"
8. Copy the **Client ID** and **Client Secret**

### Step 5: Add to Environment Variables

Add to your `.env` file:
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## MongoDB Setup

### Option 1: Local MongoDB

1. Ensure MongoDB is running:
```bash
# Windows (if not running as service)
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

2. Create database (optional - will be created automatically):
```bash
mongosh
use ticktick-clone
exit
```

3. Add to `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/ticktick-clone
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Create a new cluster (free tier available)
4. Wait for cluster to be created (5-10 minutes)
5. Click "Connect" → "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your database password
8. Add to `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ticktick-clone?retryWrites=true&w=majority
```

## Environment Variables

### Generate Secure Keys

#### JWT Secret
```bash
# Generate random string (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Encryption Key
```bash
# Generate 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Complete .env File

Create `.env` in root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ticktick-clone

# JWT (use generated key)
JWT_SECRET=your-generated-jwt-secret-here

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend
CLIENT_URL=http://localhost:3000

# Encryption (use generated key)
ENCRYPTION_KEY=your-32-character-key-here

# Optional: Web Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:your-email@example.com
```

Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

## Running the Application

### Development Mode

#### Option 1: Run Both (Recommended)
```bash
# From root directory
npm run dev
```
This runs both backend (port 5000) and frontend (port 3000) concurrently.

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

### First Time Setup

1. Open http://localhost:3000
2. Click "Sign up"
3. Register with email/password or Google
4. Default lists will be created automatically
5. Start creating tasks!

## LLM Configuration

### Option 1: OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. In TaskFlow:
   - Go to Settings → AI Assistant
   - Select "OpenAI"
   - Paste your API key
   - Click "Configure"

### Option 2: DeepSeek

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create new API key
5. Copy the key
6. In TaskFlow:
   - Go to Settings → AI Assistant
   - Select "DeepSeek"
   - Paste your API key
   - Click "Configure"

### Using Smart Input

1. Click the "+" button in header
2. Type natural language:
   ```
   "Create a task for team meeting tomorrow at 2PM"
   "Remind me to buy groceries every Sunday"
   "High priority: Finish project report by Friday"
   ```
3. AI will parse and create the task
4. If details are missing, AI will ask for clarification

## Troubleshooting

### MongoDB Connection Issues

**Error: "MongoServerError: connect ECONNREFUSED"**

Solution:
```bash
# Check if MongoDB is running
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker start mongodb
```

### Port Already in Use

**Error: "Port 5000 is already in use"**

Solution:
```bash
# Find and kill process using port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

### Google OAuth Redirect URI Mismatch

**Error: "redirect_uri_mismatch"**

Solution:
1. Check Google Cloud Console → Credentials
2. Ensure redirect URIs match exactly:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:3000/auth/callback`
3. No trailing slashes
4. Correct protocol (http vs https)

### LLM API Key Invalid

**Error: "Invalid API key"**

Solution:
1. Verify key is correct (no extra spaces)
2. Check API key hasn't expired
3. Ensure you have credits/quota available
4. For OpenAI: Key should start with `sk-`

### Frontend Not Connecting to Backend

**Error: "Network Error" or CORS issues**

Solution:
1. Verify backend is running on port 5000
2. Check `client/.env` has correct API URL
3. Ensure CORS is configured in backend
4. Try clearing browser cache

### Module Not Found Errors

**Error: "Cannot find module"**

Solution:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For frontend
cd client
rm -rf node_modules package-lock.json
npm install
```

### Database Migration Issues

If you need to reset the database:

```bash
# Connect to MongoDB
mongosh

# Drop database
use ticktick-clone
db.dropDatabase()

# Exit and restart app
exit
npm run dev
```

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

## Getting Help

If you encounter issues not covered here:

1. Check the main README.md
2. Search existing GitHub issues
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)
   - Relevant logs

---

**Happy Task Managing! 🚀**

