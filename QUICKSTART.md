# TaskFlow - Quick Start Guide

Get up and running with TaskFlow in 5 minutes!

## Prerequisites

- Node.js v16+ installed
- MongoDB running locally or MongoDB Atlas account
- Google Cloud Console account (for OAuth)

## 1. Installation (2 minutes)

```bash
# Clone and install
git clone <repository-url>
cd Planner
npm install
cd client && npm install && cd ..
```

## 2. Environment Setup (2 minutes)

### Create `.env` file in root:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ticktick-clone
JWT_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### Generate Secrets:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 3. Google OAuth Setup (1 minute)

**Quick Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google+ API" and "Google Calendar API"
3. Create OAuth credentials
4. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID and Secret to `.env`

**Detailed instructions:** See [SETUP_GUIDE.md](SETUP_GUIDE.md#google-oauth-configuration)

## 4. Start the Application

```bash
# Start MongoDB (if not running)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB

# Run the app (both backend and frontend)
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 5. First Steps

1. **Sign Up**
   - Go to http://localhost:3000
   - Click "Sign up" or "Continue with Google"
   - Create your account

2. **Create Your First Task**
   - Click "New Task" button
   - Add title, due date, priority
   - Click "Create Task"

3. **Try Smart Input (AI)**
   - Click the "+" button in header
   - First, configure AI in Settings → AI Assistant
   - Enter your OpenAI or DeepSeek API key
   - Then type: "Remind me to call mom tomorrow at 2PM"
   - AI will create the task automatically!

4. **Explore Features**
   - ✅ Create lists and organize tasks
   - 🎯 Track habits
   - ⏱️ Use Pomodoro timer
   - 📅 View calendar
   - 🔄 Sync with Google Calendar

## Common Issues

### MongoDB not connecting?
```bash
# Check if MongoDB is running
# macOS/Linux
ps aux | grep mongod

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod           # Linux
```

### Port 5000 already in use?
```bash
# Change PORT in .env to 5001
PORT=5001
```

### Google OAuth not working?
- Verify redirect URI matches exactly in Google Console
- Check Client ID and Secret are correct
- Ensure APIs are enabled

## Next Steps

- 📖 Read full [README.md](README.md) for detailed features
- 🔧 Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for troubleshooting
- 📚 Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details

## Getting Help

- Check existing issues on GitHub
- Create new issue with error details
- Include: OS, Node version, error message

---

**Ready to boost your productivity! 🚀**

## Feature Highlights

### Smart Input Examples
```
"Create a task for team meeting tomorrow at 2PM"
"Remind me to buy groceries every Sunday"
"High priority: Finish project report by Friday"
"Daily standup at 9AM on weekdays"
```

### Keyboard Shortcuts
- `Ctrl/Cmd + K` - Quick search
- `Ctrl/Cmd + N` - New task
- `Ctrl/Cmd + /` - Toggle sidebar

### Tips
- Use tags to organize tasks: `#work`, `#personal`
- Set priorities for important tasks
- Enable Google Calendar sync for seamless integration
- Track habits to build consistency
- Use Pomodoro timer for focused work sessions

---

**Happy Task Managing! ✨**

