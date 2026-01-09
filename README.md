# TaskFlow - Smart Task Management Application

A modern, full-stack task management application inspired by TickTick, featuring Google OAuth, Calendar synchronization, and AI-powered task creation using LLM integration (OpenAI/DeepSeek).

## 🚀 Features

### Core Task Management
- ✅ Create, edit, delete, and organize tasks
- 📋 Custom lists and smart lists (Inbox, Today, Next 7 Days, All, Completed)
- 🏷️ Tags, priorities, and due dates
- ✔️ Subtasks and checklists
- 📎 File attachments
- 🔄 Recurring tasks (daily, weekly, monthly, custom)
- 🔍 Full-text search and filtering
- 🎯 Drag-and-drop task reordering

### AI-Powered Features
- 🤖 **Smart Input**: Natural language task creation using LLM
- 💬 Interactive clarification for missing details
- ✨ Automatic task parsing (title, description, due date, priority, recurrence)
- 🧠 Support for OpenAI GPT-4 and DeepSeek models

### Google Integration
- 🔐 Google OAuth 2.0 authentication
- 📅 Google Calendar synchronization (import/export)
- 🔄 Two-way sync for tasks and events
- 🔗 Link tasks to calendar events

### Productivity Tools
- ⏱️ **Pomodoro Timer**: Built-in focus timer (25-min work sessions)
- 🎯 **Habits Tracker**: Track daily/weekly habits with streaks
- 📊 **Statistics Dashboard**: Task completion rates, streaks, productivity insights
- 📆 **Calendar View**: Visual task organization by date

### User Experience
- 🌓 Light/Dark theme support
- 📱 Responsive design (mobile, tablet, desktop)
- 🔔 Real-time updates via WebSockets
- 🎨 Modern, clean UI with Material-UI
- 🚀 Fast and intuitive navigation

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Passport.js** for authentication (Local, Google OAuth, JWT)
- **Socket.io** for real-time updates
- **Google APIs** for Calendar integration
- **OpenAI SDK** for LLM integration
- **Crypto-JS** for API key encryption

### Frontend
- **React 18** with Hooks
- **Redux Toolkit** for state management
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **Axios** for API requests
- **Socket.io Client** for real-time features
- **DnD Kit** for drag-and-drop
- **Formik & Yup** for form validation
- **React Calendar** for calendar views

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Google Cloud Console project (for OAuth)
- OpenAI or DeepSeek API key (optional, for AI features)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Planner
```

### 2. Install Dependencies

#### Backend
```bash
npm install
```

#### Frontend
```bash
cd client
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ticktick-clone

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL
CLIENT_URL=http://localhost:3000

# Encryption Key for API Keys Storage (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# Web Push (optional - for notifications)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com

# LLM API Keys (optional - users can input their own)
OPENAI_API_KEY=sk-your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key
```

Create a `.env` file in the `client` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:3000/auth/callback`
7. Copy Client ID and Client Secret to `.env`

### 5. Start MongoDB

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 6. Run the Application

#### Development Mode (runs both backend and frontend)
```bash
npm run dev
```

#### Or run separately:

**Backend:**
```bash
npm run server
```

**Frontend:**
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🎯 Usage Guide

### Getting Started

1. **Sign Up/Login**
   - Register with email/password or use Google OAuth
   - Default lists are created automatically (Inbox, Today, etc.)

2. **Create Your First Task**
   - Click "New Task" button
   - Fill in task details (title, description, due date, priority)
   - Or use **Smart Input** (AI button) for natural language creation

3. **Smart Input Examples**
   ```
   "Create a task for having lunch every day at 6PM"
   "Remind me to call mom tomorrow at 10AM"
   "Weekly grocery shopping on Sundays"
   "Plan vacation - high priority, due next Friday"
   ```

4. **Organize with Lists**
   - Create custom lists for projects
   - Use smart lists for quick filtering
   - Drag and drop tasks between lists

5. **Track Habits**
   - Go to Habits page
   - Create daily/weekly habits
   - Mark as complete each day
   - Track your streaks

6. **Use Pomodoro Timer**
   - Available on Dashboard
   - Default: 25 minutes work sessions
   - Customize in Settings

7. **Sync with Google Calendar**
   - Go to Settings → Google Calendar
   - Connect your Google account
   - Import events or export tasks
   - Enable two-way sync

### AI Assistant Setup

1. Go to **Settings** → **AI Assistant**
2. Choose provider (OpenAI or DeepSeek)
3. Enter your API key:
   - **OpenAI**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **DeepSeek**: Get from [platform.deepseek.com](https://platform.deepseek.com)
4. Click "Configure AI Assistant"
5. Use Smart Input button (+ icon) in header

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Encrypted API key storage
- HTTPS support (configure reverse proxy)
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Secure session management

## 📱 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with email/password
GET    /api/auth/google            - Initiate Google OAuth
GET    /api/auth/google/callback   - Google OAuth callback
GET    /api/auth/me                - Get current user
PUT    /api/auth/profile           - Update user profile
POST   /api/auth/disconnect-google - Disconnect Google account
```

### Task Endpoints

```
GET    /api/tasks                  - Get all tasks (with filters)
GET    /api/tasks/:id              - Get single task
POST   /api/tasks                  - Create task
PUT    /api/tasks/:id              - Update task
DELETE /api/tasks/:id              - Delete task
PATCH  /api/tasks/bulk-update      - Bulk update tasks (reorder)
POST   /api/tasks/:id/attachments  - Upload attachment
GET    /api/tasks/stats/summary    - Get task statistics
```

### List Endpoints

```
GET    /api/lists                  - Get all lists
GET    /api/lists/:id              - Get single list
POST   /api/lists                  - Create list
PUT    /api/lists/:id              - Update list
DELETE /api/lists/:id              - Delete list
PATCH  /api/lists/reorder          - Reorder lists
```

### Habit Endpoints

```
GET    /api/habits                 - Get all habits
GET    /api/habits/:id             - Get single habit
POST   /api/habits                 - Create habit
PUT    /api/habits/:id             - Update habit
DELETE /api/habits/:id             - Delete habit
POST   /api/habits/:id/complete    - Mark habit complete
POST   /api/habits/:id/uncomplete  - Unmark habit
GET    /api/habits/:id/stats       - Get habit statistics
```

### Google Calendar Endpoints

```
GET    /api/calendar/status        - Check connection status
POST   /api/calendar/import        - Import events from Google
POST   /api/calendar/export/:id    - Export task to Google
POST   /api/calendar/sync          - Sync all tasks
DELETE /api/calendar/event/:id     - Delete calendar event
```

### LLM Endpoints

```
GET    /api/llm/config             - Get LLM configuration status
POST   /api/llm/config             - Set LLM configuration
DELETE /api/llm/config             - Remove LLM configuration
POST   /api/llm/parse              - Parse natural language input
POST   /api/llm/chat               - Continue conversation
POST   /api/llm/suggest            - Generate task suggestions
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client
npm test

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Backend Deployment (Heroku example)

```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set GOOGLE_CLIENT_ID=your-client-id
# ... set all other env variables

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel example)

```bash
cd client
npm run build

# Deploy to Vercel
vercel --prod
```

### Production Considerations

1. Use a production MongoDB instance (MongoDB Atlas)
2. Enable HTTPS with SSL certificates
3. Set up reverse proxy (Nginx)
4. Configure CORS for production domains
5. Enable rate limiting
6. Set up monitoring and logging
7. Configure backup strategies
8. Use environment-specific configs

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by [TickTick](https://ticktick.com/)
- Material-UI for the component library
- OpenAI for GPT models
- Google for OAuth and Calendar APIs

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: your-email@example.com

## 🗺️ Roadmap

- [ ] Mobile apps (React Native)
- [ ] Team collaboration features
- [ ] Task templates
- [ ] Advanced analytics
- [ ] Email reminders
- [ ] Voice input
- [ ] Offline mode
- [ ] Third-party integrations (Slack, Trello, etc.)

---

**Built with ❤️ using React, Node.js, and AI**

