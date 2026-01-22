# NovaDo v1.0 - REST API Documentation

**Base URL**: `http://localhost:5000/api`  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

---

## 📑 Table of Contents

1. [Authentication](#authentication)
2. [Tasks](#tasks)
3. [Lists](#lists)
4. [Tags](#tags)
5. [Habits](#habits)
6. [Focus Sessions](#focus-sessions)
7. [Statistics](#statistics)
8. [AI/LLM](#aillm)
9. [Google Calendar](#google-calendar)
10. [User & Preferences](#user--preferences)
11. [Notifications](#notifications)
12. [File Uploads](#file-uploads)
13. [Banner Management](#banner-management)
14. [Error Responses](#error-responses)

---

## 🔐 Authentication

### Register User
**POST** `/auth/register`

Create a new user account and receive authentication token.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {
      "theme": "light",
      "language": "en",
      "timezone": "UTC",
      "notifications": {...},
      "pomodoroSettings": {...}
    }
  }
}
```

**Notes:**
- Password must be at least 6 characters
- Email must be unique
- Default lists are created automatically
- Token is valid indefinitely (no expiration)

---

### Login
**POST** `/auth/login`

Authenticate existing user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

**Errors:**
- `400` - Invalid credentials

---

### Get Current User
**GET** `/auth/me`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {...},
    "stats": {
      "totalTasksCompleted": 42,
      "currentStreak": 7,
      "longestStreak": 14
    }
  }
}
```

---

## ✅ Tasks

### Get All Tasks
**GET** `/tasks/`

Retrieve tasks with optional filters.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `list` (string) - Filter by list ID
- `status` (string) - Filter by status: `scheduled`, `in_progress`, `completed`, `skipped`, `todo`
- `priority` (string) - Filter by priority: `none`, `low`, `medium`, `high`
- `tag` (string) - Filter by tag (fullPath)
- `search` (string) - Search in title, description, tags (case-insensitive regex)
- `dueDate` (string) - Filter by due date: `today`, `next7days`, `overdue`

**Example Request:**
```
GET /tasks/?status=completed&priority=high&search=meeting
```

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Complete project report",
      "description": "Finalize Q1 report with charts",
      "user": "507f191e810c19729de860ea",
      "list": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Work",
        "color": "#6366F1",
        "icon": "💼"
      },
      "dueDate": "2026-01-22T00:00:00",
      "dueTime": "14:30",
      "priority": "high",
      "status": "completed",
      "tags": ["work", "reports"],
      "subtasks": [
        {"title": "Gather data", "completed": true},
        {"title": "Create charts", "completed": true}
      ],
      "attachments": [],
      "completedAt": "2026-01-21T15:45:00",
      "createdAt": "2026-01-15T09:00:00",
      "updatedAt": "2026-01-21T15:45:00"
    }
  ]
}
```

---

### Get Single Task
**GET** `/tasks/{task_id}`

Retrieve a specific task by ID.

**Response:** `200 OK`
```json
{
  "task": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete project report",
    ...
  }
}
```

**Errors:**
- `400` - Invalid task ID format
- `404` - Task not found

---

### Create Task
**POST** `/tasks/`

Create a new task.

**Request Body:**
```json
{
  "title": "New task",
  "description": "Optional description",
  "list": "507f1f77bcf86cd799439012",
  "dueDate": "2026-01-25T00:00:00",
  "dueTime": "14:30",
  "priority": "medium",
  "tags": ["work", "urgent"]
}
```

**Required Fields:**
- `title` (string)

**Optional Fields:**
- `description` (string, default: "")
- `list` (string, default: user's Inbox list)
- `dueDate` (datetime ISO string)
- `dueTime` (string, "HH:MM" format)
- `priority` (enum: "none", "low", "medium", "high", default: "none")
- `tags` (array of strings)
- `subtasks` (array of `{title: string, completed: boolean}`)
- `attachments` (array of attachment objects)
- `recurrence` (object with recurrence settings)

**Response:** `201 Created`
```json
{
  "task": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "New task",
    "status": "scheduled",
    ...
  }
}
```

**Notes:**
- Status is automatically set to `scheduled`
- If `list` is empty or invalid, defaults to user's Inbox
- Task is assigned to authenticated user automatically

---

### Update Task
**PUT** `/tasks/{task_id}`

Update an existing task.

**Request Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "list": "new_list_id",
  "dueDate": "2026-01-26T00:00:00",
  "dueTime": "15:00",
  "priority": "high",
  "status": "completed",
  "tags": ["work", "important"]
}
```

**Response:** `200 OK`
```json
{
  "task": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Updated title",
    "completedAt": "2026-01-21T16:30:00",
    ...
  }
}
```

**Special Behaviors:**
- Setting `status: "completed"` sets `completedAt` timestamp
- Setting `status: "in_progress"` sets `startedAt` timestamp (if not already set)
- Completing a task increments user's `totalTasksCompleted` stat
- Reopening a completed task clears `completedAt`

---

### Delete Task
**DELETE** `/tasks/{task_id}`

Permanently delete a task.

**Response:** `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

**Errors:**
- `404` - Task not found

---

## 📋 Lists

### Get All Lists
**GET** `/lists/`

Retrieve all lists for the authenticated user.

**Response:** `200 OK`
```json
{
  "lists": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Inbox",
      "user": "507f191e810c19729de860ea",
      "color": "#6366F1",
      "icon": "📥",
      "isDefault": true,
      "isSmart": false,
      "smartFilter": null,
      "order": 0,
      "taskCount": 5
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Work Projects",
      "color": "#10B981",
      "icon": "💼",
      "isDefault": false,
      "order": 5,
      "taskCount": 12
    }
  ]
}
```

**Notes:**
- `taskCount` only includes non-completed tasks
- Lists are sorted by `order` field
- Archived lists (`isArchived: true`) are excluded

---

### Create List
**POST** `/lists/`

Create a new custom list.

**Request Body:**
```json
{
  "name": "Work Projects",
  "color": "#10B981",
  "icon": "💼",
  "parent": null
}
```

**Required Fields:**
- `name` (string)

**Optional Fields:**
- `color` (string, hex color, default: random)
- `icon` (string, emoji or icon name)
- `parent` (string, parent list ID for nested lists)

**Response:** `201 Created`
```json
{
  "list": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Work Projects",
    "color": "#10B981",
    "icon": "💼",
    "isDefault": false,
    "order": 5,
    "taskCount": 0
  }
}
```

---

### Update List
**PUT** `/lists/{list_id}`

Update list properties.

**Request Body:** (all fields optional)
```json
{
  "name": "Renamed List",
  "color": "#EF4444",
  "icon": "🔥",
  "order": 10
}
```

**Response:** `200 OK`
```json
{
  "list": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Renamed List",
    ...
  }
}
```

---

### Delete List
**DELETE** `/lists/{list_id}`

Delete a custom list and move its tasks to Inbox.

**Response:** `200 OK`
```json
{
  "message": "List deleted successfully"
}
```

**Errors:**
- `400` - Cannot delete default lists
- `404` - List not found

**Notes:**
- All tasks in the deleted list are moved to user's Inbox
- Default lists (Inbox, Today, etc.) cannot be deleted

---

## 🏷️ Tags

### Get All Tags
**GET** `/tags/`

Retrieve all tags, including explicitly created and auto-discovered tags.

**Response:** `200 OK`
```json
{
  "tags": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Work",
      "fullPath": "work",
      "parentId": null,
      "user": "507f191e810c19729de860ea",
      "color": "#6366F1",
      "icon": "💼",
      "order": 0,
      "taskCount": 15
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Projects",
      "fullPath": "work:projects",
      "parentId": "507f1f77bcf86cd799439014",
      "color": "#10B981",
      "icon": "📁",
      "order": 1,
      "taskCount": 8
    },
    {
      "_id": "discovered_urgent",
      "name": "Urgent",
      "fullPath": "urgent",
      "parentId": null,
      "color": "#6B7280",
      "icon": "🏷️",
      "order": 999,
      "isDiscovered": true,
      "taskCount": 3
    }
  ]
}
```

**Notes:**
- `taskCount` for parent tags includes child tag tasks
- Discovered tags have `isDiscovered: true` and virtual IDs
- Tags are hierarchical using `fullPath` notation (e.g., `parent:child:grandchild`)

---

### Create Tag
**POST** `/tags/`

Create a new tag (parent or child).

**Request Body:**
```json
{
  "name": "Projects",
  "parentId": "507f1f77bcf86cd799439014",
  "color": "#10B981",
  "icon": "📁"
}
```

**Required Fields:**
- `name` (string)

**Optional Fields:**
- `parentId` (string, parent tag ID)
- `color` (string, hex color, default: random)
- `icon` (string, emoji or icon name)

**Response:** `201 Created`
```json
{
  "tag": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Projects",
    "fullPath": "work:projects",
    "parentId": "507f1f77bcf86cd799439014",
    "color": "#10B981",
    "icon": "📁",
    "taskCount": 0
  }
}
```

**Notes:**
- `fullPath` is auto-generated from parent hierarchy
- Duplicate `fullPath` validation enforced

---

### Update Tag
**PUT** `/tags/{tag_id}`

Update tag properties. Renaming a parent tag updates all child tags' `fullPath`.

**Request Body:** (all fields optional)
```json
{
  "name": "New Name",
  "color": "#EF4444",
  "icon": "🔥",
  "order": 5
}
```

**Response:** `200 OK`
```json
{
  "tag": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "New Name",
    "fullPath": "work:new-name",
    ...
  }
}
```

**Notes:**
- Renaming a tag updates its `fullPath` and all descendants
- Also updates tasks using the old `fullPath` to use new path

---

### Delete Tag
**DELETE** `/tags/{tag_id}`

Delete a tag. Tasks using this tag have it removed from their `tags` array.

**Response:** `200 OK`
```json
{
  "message": "Tag deleted successfully"
}
```

**Errors:**
- `400` - Cannot delete discovered tags
- `404` - Tag not found

---

## 🔥 Habits

### Get All Habits
**GET** `/habits/`

Retrieve user's habits.

**Query Parameters:**
- `isActive` (boolean) - Filter by active status

**Response:** `200 OK`
```json
{
  "habits": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "name": "Morning Exercise",
      "description": "30 minutes of cardio",
      "user": "507f191e810c19729de860ea",
      "frequency": "daily",
      "targetDays": 7,
      "targetCount": 1,
      "completions": [
        {
          "date": "2026-01-21T00:00:00",
          "count": 1,
          "note": "Felt great!"
        }
      ],
      "currentStreak": 7,
      "longestStreak": 14,
      "color": "#10B981",
      "icon": "💪",
      "reminder": {"enabled": false},
      "isActive": true,
      "startDate": "2026-01-15T00:00:00"
    }
  ]
}
```

---

### Create Habit
**POST** `/habits/`

Create a new habit.

**Request Body:**
```json
{
  "name": "Morning Exercise",
  "description": "30 minutes of cardio",
  "frequency": "daily",
  "targetDays": 7,
  "targetCount": 1,
  "color": "#10B981",
  "icon": "💪",
  "reminder": {
    "enabled": true,
    "time": "07:00"
  }
}
```

**Required Fields:**
- `name` (string)
- `frequency` (string)
- `targetDays` (integer)
- `targetCount` (integer)

**Response:** `201 Created`
```json
{
  "habit": {
    "_id": "507f1f77bcf86cd799439016",
    "name": "Morning Exercise",
    "currentStreak": 0,
    "longestStreak": 0,
    ...
  }
}
```

---

### Complete Habit
**POST** `/habits/{habit_id}/complete`

Mark habit as completed for a specific date.

**Request Body:**
```json
{
  "date": "2026-01-21T00:00:00",
  "count": 1,
  "note": "Felt great today!"
}
```

**Response:** `200 OK`
```json
{
  "habit": {
    "_id": "507f1f77bcf86cd799439016",
    "completions": [...],
    "currentStreak": 8,
    "longestStreak": 14
  }
}
```

**Notes:**
- Completing for the same date increments the count
- Streak is recalculated based on consecutive completions
- Date is normalized to midnight

---

### Delete Habit
**DELETE** `/habits/{habit_id}`

Permanently delete a habit.

**Response:** `200 OK`
```json
{
  "message": "Habit deleted successfully"
}
```

---

## ⏱️ Focus Sessions

### Record Focus Session
**POST** `/focus/sessions`

Save a completed Pomodoro or Stopwatch session.

**Request Body:**
```json
{
  "taskId": "507f1f77bcf86cd799439011",
  "taskTitle": "Complete project report",
  "tags": ["work", "reports"],
  "duration": 25,
  "startTime": "2026-01-21T14:00:00Z",
  "endTime": "2026-01-21T14:25:00Z",
  "type": "pomo"
}
```

**Required Fields:**
- `duration` (integer, minutes)
- `startTime` (datetime ISO string)
- `endTime` (datetime ISO string)
- `type` (enum: "pomo" or "stopwatch")

**Optional Fields:**
- `taskId` (string)
- `taskTitle` (string)
- `tags` (array of strings)

**Response:** `200 OK`
```json
{
  "message": "Focus session recorded",
  "id": "507f1f77bcf86cd799439020"
}
```

---

### Get Focus Sessions
**GET** `/focus/sessions`

Retrieve focus session history.

**Query Parameters:**
- `limit` (integer, default: 50) - Max number of sessions
- `days` (integer, default: 30) - Include sessions from last N days

**Response:** `200 OK`
```json
{
  "sessions": {
    "2026-01-21": [
      {
        "id": "507f1f77bcf86cd799439020",
        "taskId": "507f1f77bcf86cd799439011",
        "taskTitle": "Complete project report",
        "tags": ["work"],
        "duration": 25,
        "startTime": "2026-01-21T14:00:00Z",
        "endTime": "2026-01-21T14:25:00Z",
        "type": "pomo",
        "createdAt": "2026-01-21T14:25:05Z"
      }
    ]
  }
}
```

**Notes:**
- Sessions are grouped by date (YYYY-MM-DD)
- Sorted by `createdAt` descending within each date

---

### Get Focus Statistics
**GET** `/focus/stats`

Get aggregated focus session statistics.

**Response:** `200 OK`
```json
{
  "today": {
    "pomos": 4,
    "duration": 100
  },
  "total": {
    "pomos": 142,
    "duration": 3550
  },
  "byTag": [
    {
      "tag": "work",
      "count": 80,
      "duration": 2000
    },
    {
      "tag": "personal",
      "count": 62,
      "duration": 1550
    }
  ]
}
```

**Notes:**
- `duration` is in minutes
- `byTag` is sorted by total duration (descending)
- Top 10 tags included

---

### Delete Focus Session
**DELETE** `/focus/sessions/{session_id}`

Delete a specific focus session.

**Response:** `200 OK`
```json
{
  "message": "Session deleted"
}
```

---

## 📊 Statistics

### Get Main Statistics
**GET** `/stats/`

Get comprehensive productivity statistics.

**Response:** `200 OK`
```json
{
  "completedToday": 5,
  "completedWeek": 23,
  "streak": 7,
  "pomodoros": 4,
  "weeklyData": [
    {"day": "Mon", "count": 3},
    {"day": "Tue", "count": 5},
    ...
  ],
  "totalTasks": 156,
  "completedTasks": 142,
  "skippedTasks": 8,
  "pendingTasks": 6
}
```

---

### Get Monthly Statistics
**GET** `/stats/monthly`

Get monthly aggregated statistics.

**Response:** `200 OK`
```json
{
  "totalFocusHours": 58.5,
  "goalAchievement": 87,
  "categoryBreakdown": {
    "work": 45,
    "personal": 32,
    "learning": 23
  }
}
```

---

### Get Habit Statistics
**GET** `/stats/habits`

Get habit-specific statistics.

**Response:** `200 OK`
```json
{
  "habits": [
    {
      "id": "507f1f77bcf86cd799439016",
      "name": "Morning Exercise",
      "completionRate": 85.7,
      "currentStreak": 7,
      "totalCompletions": 42
    }
  ],
  "totalHabits": 5,
  "averageCompletionRate": 78.4
}
```

---

## 🤖 AI/LLM

### Get LLM Configuration Status
**GET** `/llm/config`

Check if AI is configured for the user.

**Response:** `200 OK`
```json
{
  "provider": "gemini",
  "configured": true
}
```

---

### Set LLM Configuration
**POST** `/llm/config`

Save AI provider and API key.

**Request Body:**
```json
{
  "provider": "gemini",
  "apiKey": "your-api-key-here"
}
```

**Valid Providers:**
- `gemini` - Google Gemini (free tier)
- `groq` - Groq with Llama 3.1 (free tier)
- `openai` - OpenAI GPT-3.5 (paid)

**Response:** `200 OK`
```json
{
  "message": "LLM configuration saved successfully",
  "provider": "gemini"
}
```

**Notes:**
- API key is encrypted before storage
- Provider must be valid enum value

---

### Remove LLM Configuration
**DELETE** `/llm/config`

Remove AI configuration from user account.

**Response:** `200 OK`
```json
{
  "message": "LLM configuration removed successfully"
}
```

---

### Parse Natural Language
**POST** `/llm/parse`

Convert natural language to structured task data.

**Request Body:**
```json
{
  "input": "Meeting with John tomorrow at 3pm high priority #work #meeting"
}
```

**Response:** `200 OK`
```json
{
  "task": {
    "title": "Meeting with John",
    "description": "",
    "dueDate": "2026-01-22T15:00:00",
    "priority": "high",
    "tags": ["work", "meeting"]
  }
}
```

**Errors:**
- `400` - AI not configured (need to set API key first)

**Notes:**
- Uses configured LLM provider
- Current date/time added to context
- Parses relative dates, priorities, tags

---

### Chat with AI
**POST** `/llm/chat`

Have a conversation with the AI assistant.

**Request Body:**
```json
{
  "message": "How should I prioritize my tasks today?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "I have 10 tasks due today"
    },
    {
      "role": "assistant",
      "content": "Let's review them..."
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "response": "Based on urgency and importance, I recommend..."
}
```

---

## 📅 Google Calendar

### Get Configuration Status
**GET** `/calendar/config`

Check if Google Calendar credentials are configured.

**Response:** `200 OK`
```json
{
  "configured": true,
  "message": "Google Calendar is configured"
}
```

---

### Get Connection Status
**GET** `/calendar/status`

Check if user's Google account is connected.

**Response:** `200 OK`
```json
{
  "connected": true,
  "email": "john@gmail.com",
  "configured": true,
  "token_expired": false,
  "warning": null
}
```

---

### Start OAuth Flow
**GET** `/calendar/auth`

Initiate Google OAuth 2.0 authorization.

**Response:** `200 OK`
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?...",
  "state": "random-state-token"
}
```

**Notes:**
- User should be redirected to `authorization_url`
- After authorization, Google redirects to callback URL
- State is stored in database for verification

---

### OAuth Callback
**GET** `/calendar/callback`

Handle Google OAuth callback (redirect endpoint).

**Query Parameters:**
- `code` (string) - Authorization code from Google
- `state` (string) - State token for verification
- `error` (string, optional) - Error from Google

**Response:** `302 Redirect`
Redirects to `/?google_auth=success` or `/?google_auth=error&message=...`

---

### Disconnect Google Account
**POST** `/calendar/disconnect`

Disconnect Google Calendar and delete synced events.

**Response:** `200 OK`
```json
{
  "message": "Google Calendar disconnected",
  "deleted_events": 42
}
```

**Notes:**
- Deletes all tasks with `googleEventId`
- Clears Google tokens from user account

---

### List Available Calendars
**GET** `/calendar/calendars`

Get list of user's Google Calendars.

**Response:** `200 OK`
```json
{
  "calendars": [
    {
      "id": "primary",
      "summary": "john@gmail.com",
      "description": "Primary calendar",
      "timeZone": "America/New_York",
      "selected": true,
      "backgroundColor": "#9FC6E7"
    }
  ]
}
```

---

### Get Calendar Events
**GET** `/calendar/events`

Fetch events from a Google Calendar.

**Query Parameters:**
- `calendar_id` (string, default: "primary") - Calendar ID
- `days_back` (integer, default: 30) - Days in the past
- `days_forward` (integer, default: 90) - Days in the future

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": "event123",
      "title": "Team Meeting",
      "description": "Weekly sync",
      "start": "2026-01-22T14:00:00Z",
      "end": "2026-01-22T15:00:00Z",
      "all_day": false,
      "location": "Conference Room A"
    }
  ],
  "total": 15
}
```

---

### Import Calendar as Tasks
**POST** `/calendar/import`

Import Google Calendar events as NovaDo tasks.

**Request Body:**
```json
{
  "import_as": "tasks",
  "calendar_id": "primary",
  "days_back": 30,
  "days_forward": 90
}
```

**Response:** `200 OK`
```json
{
  "message": "Calendar imported successfully",
  "imported_count": 15,
  "skipped_count": 2
}
```

**Notes:**
- `import_as` must be "tasks" (events mode planned)
- Skips events already imported (deduplication by `googleEventId`)
- Creates tasks with `syncedWithGoogle: true`

---

### Sync Calendars
**POST** `/calendar/sync`

Sync selected Google Calendars (re-import).

**Response:** `200 OK`
```json
{
  "message": "Calendars synced successfully",
  "results": [
    {
      "calendar_id": "primary",
      "imported": 5,
      "skipped": 10
    }
  ]
}
```

---

## 👤 User & Preferences

### Get Preferences
**GET** `/user/preferences`

Get user preferences.

**Response:** `200 OK`
```json
{
  "preferences": {
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "push": true,
      "taskReminders": true
    },
    "pomodoroSettings": {
      "workDuration": 25,
      "shortBreak": 5,
      "longBreak": 15,
      "sessionsBeforeLongBreak": 4
    },
    "bannerUrl": "/uploads/banners/user_timestamp.jpg",
    "bannerFocalX": 50,
    "bannerFocalY": 30
  }
}
```

---

### Update Preferences
**PUT** `/user/preferences`

Update user preferences.

**Request Body:** (all fields optional)
```json
{
  "theme": "pastel-calm",
  "language": "en",
  "timezone": "Europe/London",
  "notifications": {
    "email": false,
    "push": true,
    "taskReminders": true
  },
  "pomodoroSettings": {
    "workDuration": 30,
    "shortBreak": 10,
    "longBreak": 20,
    "sessionsBeforeLongBreak": 3
  }
}
```

**Response:** `200 OK`
```json
{
  "preferences": {
    "theme": "pastel-calm",
    ...
  }
}
```

---

### Change Password
**POST** `/user/change-password`

Change user's password.

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `400` - Current password is incorrect

---

## 🔔 Notifications

### Get VAPID Public Key
**GET** `/notifications/vapid-key`

Get public key for push notification subscriptions.

**Response:** `200 OK`
```json
{
  "publicKey": "BNxw..."
}
```

---

### Subscribe to Push Notifications
**POST** `/notifications/subscribe`

Save push notification subscription.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BGO...",
    "auth": "dGh..."
  },
  "expirationTime": null
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription saved"
}
```

---

### Unsubscribe from Push Notifications
**POST** `/notifications/unsubscribe`

Remove push notification subscription.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription removed"
}
```

---

### Get Subscription Status
**GET** `/notifications/status`

Check if user has active push subscription.

**Response:** `200 OK`
```json
{
  "subscribed": true,
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

---

## 📎 File Uploads

### Upload File
**POST** `/uploads/`

Upload a file attachment.

**Request Body:** `multipart/form-data`
- `file` - File to upload

**Allowed Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, TXT
- Archives: ZIP

**Max Size:** 5MB

**Response:** `200 OK`
```json
{
  "id": "uuid-file-id",
  "name": "document.pdf",
  "type": "application/pdf",
  "size": 1048576,
  "url": "/uploads/user123_uuid.pdf"
}
```

**Errors:**
- `400` - File type not allowed or size exceeds limit

---

### Download File
**GET** `/uploads/{file_id}`

Download a file by ID.

**Response:** File content with appropriate `Content-Type` header

---

## 🖼️ Banner Management

### Upload Banner
**POST** `/banner/`

Upload custom banner image for Task Matrix.

**Request Body:** `multipart/form-data`
- `file` - Image file (JPEG, PNG, GIF, WebP)

**Max Size:** 5MB

**Response:** `200 OK`
```json
{
  "success": true,
  "bannerUrl": "/uploads/banners/user123_20260121143000.jpg"
}
```

**Notes:**
- Old banner is automatically deleted
- Focal point resets to center (50, 50)

---

### Update Banner Settings
**PUT** `/banner/settings`

Update banner focal point.

**Request Body:**
```json
{
  "focalPointX": 65,
  "focalPointY": 40
}
```

**Validation:**
- `focalPointX`: 0-100 (percentage)
- `focalPointY`: 0-100 (percentage)

**Response:** `200 OK`
```json
{
  "success": true,
  "focalPointX": 65,
  "focalPointY": 40
}
```

---

### Delete Banner
**DELETE** `/banner/`

Remove banner image.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

---

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "detail": "Error message here"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Authentication Errors
```json
{
  "detail": "Could not validate credentials"
}
```

### Validation Errors (422)
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## 📝 Request/Response Notes

### Headers
**All Authenticated Requests:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Date/Time Format
- **ISO 8601**: `2026-01-21T14:30:00Z` (UTC)
- **Local Time**: `2026-01-21T14:30:00` (no timezone)
- **Time Only**: `14:30` (HH:MM, 24-hour format)
- **Date Only**: `2026-01-21` (YYYY-MM-DD)

### ObjectId Validation
All ID fields are validated as MongoDB ObjectIds (24 hex characters).

Invalid: `GET /tasks/invalid-id` → `400 Bad Request`

### Pagination
Currently not implemented. All list endpoints return all items.
Future: Add `page` and `limit` query parameters.

---

**API Version:** v1.0  
**Last Updated:** January 21, 2026  
**Base URL:** `http://localhost:5000/api`
