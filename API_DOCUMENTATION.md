# TaskFlow API Documentation

Complete REST API documentation for the TaskFlow backend.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message (optional)"
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description"
  }
}
```

---

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null,
    "preferences": { ... },
    "stats": { ... }
  }
}
```

### Login
Authenticate with email and password.

**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt_token_here",
  "user": { ... }
}
```

### Google OAuth
Initiate Google OAuth flow.

**Endpoint:** `GET /auth/google`

Redirects to Google login page.

### Google OAuth Callback
Handle Google OAuth callback.

**Endpoint:** `GET /auth/google/callback`

Redirects to frontend with token: `http://localhost:3000/auth/callback?token=<jwt_token>`

### Get Current User
Fetch authenticated user's profile.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "preferences": {
      "theme": "light",
      "language": "en",
      "notifications": { ... },
      "pomodoroSettings": { ... }
    },
    "stats": {
      "totalTasksCompleted": 42,
      "currentStreak": 5,
      "longestStreak": 12
    }
  }
}
```

### Update Profile
Update user profile information.

**Endpoint:** `PUT /auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response:** `200 OK`
```json
{
  "user": { ... }
}
```

### Disconnect Google Account
Remove Google account connection.

**Endpoint:** `POST /auth/disconnect-google`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Google account disconnected successfully"
}
```

---

## Task Endpoints

### Get All Tasks
Retrieve tasks with optional filtering.

**Endpoint:** `GET /tasks`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `list` (string): Filter by list ID
- `status` (string): Filter by status (active, completed, deleted)
- `priority` (string): Filter by priority (none, low, medium, high)
- `tag` (string): Filter by tag
- `search` (string): Search in title, description, tags
- `dueDate` (string): Filter by due date (today, next7days, overdue)

**Example:** `GET /tasks?status=active&priority=high`

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "title": "Complete project",
      "description": "Finish the final report",
      "user": "user_id",
      "list": {
        "_id": "list_id",
        "name": "Work",
        "color": "#1890ff"
      },
      "dueDate": "2024-01-15T00:00:00.000Z",
      "dueTime": "14:00",
      "priority": "high",
      "status": "active",
      "tags": ["work", "urgent"],
      "subtasks": [
        {
          "title": "Research",
          "completed": true,
          "order": 0
        }
      ],
      "attachments": [],
      "reminders": [],
      "recurrence": {
        "enabled": false
      },
      "order": 0,
      "createdByAI": false,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### Get Single Task
Retrieve a specific task.

**Endpoint:** `GET /tasks/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "task": { ... }
}
```

### Create Task
Create a new task.

**Endpoint:** `POST /tasks`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "title": "New task",
  "description": "Task description",
  "list": "list_id",
  "dueDate": "2024-01-20",
  "dueTime": "15:00",
  "priority": "medium",
  "tags": ["personal"],
  "subtasks": [
    {
      "title": "Subtask 1",
      "completed": false,
      "order": 0
    }
  ],
  "recurrence": {
    "enabled": true,
    "pattern": "daily",
    "interval": 1
  }
}
```

**Response:** `201 Created`
```json
{
  "task": { ... }
}
```

### Update Task
Update an existing task.

**Endpoint:** `PUT /tasks/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:** (partial update supported)
```json
{
  "title": "Updated title",
  "status": "completed",
  "priority": "high"
}
```

**Response:** `200 OK`
```json
{
  "task": { ... }
}
```

### Delete Task
Delete a task.

**Endpoint:** `DELETE /tasks/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

### Bulk Update Tasks
Update multiple tasks (for reordering).

**Endpoint:** `PATCH /tasks/bulk-update`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "updates": [
    {
      "id": "task_id_1",
      "order": 0,
      "list": "list_id"
    },
    {
      "id": "task_id_2",
      "order": 1
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Tasks updated successfully"
}
```

### Upload Attachment
Upload a file attachment to a task.

**Endpoint:** `POST /tasks/:id/attachments`

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:** Form data with `file` field

**Response:** `200 OK`
```json
{
  "attachment": {
    "filename": "uuid-filename.pdf",
    "originalName": "document.pdf",
    "mimetype": "application/pdf",
    "size": 102400,
    "url": "/uploads/uuid-filename.pdf",
    "uploadedAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### Get Task Statistics
Get summary statistics for tasks.

**Endpoint:** `GET /tasks/stats/summary`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "stats": {
    "totalActive": 15,
    "completedToday": 5,
    "overdue": 2,
    "upcoming": 8
  }
}
```

---

## List Endpoints

### Get All Lists
Retrieve all lists for the user.

**Endpoint:** `GET /lists`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "lists": [
    {
      "_id": "list_id",
      "name": "Inbox",
      "user": "user_id",
      "color": "#1890ff",
      "icon": "inbox",
      "isDefault": true,
      "isSmart": false,
      "smartFilter": null,
      "parent": null,
      "order": 0,
      "isArchived": false,
      "taskCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Single List
Retrieve a specific list.

**Endpoint:** `GET /lists/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "list": { ... }
}
```

### Create List
Create a new list.

**Endpoint:** `POST /lists`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "My Project",
  "color": "#52c41a",
  "icon": "folder"
}
```

**Response:** `201 Created`
```json
{
  "list": { ... }
}
```

### Update List
Update an existing list.

**Endpoint:** `PUT /lists/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Updated Name",
  "color": "#faad14"
}
```

**Response:** `200 OK`
```json
{
  "list": { ... }
}
```

### Delete List
Delete a list (moves tasks to Inbox).

**Endpoint:** `DELETE /lists/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "List deleted successfully"
}
```

### Reorder Lists
Update the order of multiple lists.

**Endpoint:** `PATCH /lists/reorder`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "orders": [
    { "id": "list_id_1", "order": 0 },
    { "id": "list_id_2", "order": 1 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Lists reordered successfully"
}
```

---

## Habit Endpoints

### Get All Habits
Retrieve all habits.

**Endpoint:** `GET /habits`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `isActive` (boolean): Filter by active status

**Response:** `200 OK`
```json
{
  "habits": [
    {
      "_id": "habit_id",
      "name": "Morning Exercise",
      "description": "30 minutes of exercise",
      "user": "user_id",
      "frequency": "daily",
      "targetDays": [],
      "targetCount": 1,
      "completions": [
        {
          "date": "2024-01-10T00:00:00.000Z",
          "count": 1,
          "note": "Felt great!"
        }
      ],
      "currentStreak": 5,
      "longestStreak": 12,
      "color": "#52c41a",
      "icon": "check-circle",
      "reminder": {
        "enabled": true,
        "time": "07:00"
      },
      "isActive": true,
      "isArchived": false,
      "startDate": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-10T00:00:00.000Z"
    }
  ]
}
```

### Create Habit
Create a new habit.

**Endpoint:** `POST /habits`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Read Daily",
  "description": "Read for 30 minutes",
  "frequency": "daily",
  "targetCount": 1,
  "color": "#1890ff",
  "reminder": {
    "enabled": true,
    "time": "20:00"
  }
}
```

**Response:** `201 Created`
```json
{
  "habit": { ... }
}
```

### Update Habit
Update an existing habit.

**Endpoint:** `PUT /habits/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Updated Name",
  "targetCount": 2
}
```

**Response:** `200 OK`
```json
{
  "habit": { ... }
}
```

### Delete Habit
Delete a habit.

**Endpoint:** `DELETE /habits/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Habit deleted successfully"
}
```

### Complete Habit
Mark habit as completed for a date.

**Endpoint:** `POST /habits/:id/complete`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "date": "2024-01-10T00:00:00.000Z",
  "count": 1,
  "note": "Optional note"
}
```

**Response:** `200 OK`
```json
{
  "habit": { ... }
}
```

### Uncomplete Habit
Remove completion for a date.

**Endpoint:** `POST /habits/:id/uncomplete`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "date": "2024-01-10T00:00:00.000Z"
}
```

**Response:** `200 OK`
```json
{
  "habit": { ... }
}
```

### Get Habit Statistics
Get statistics for a habit.

**Endpoint:** `GET /habits/:id/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "stats": {
    "totalCompletions": 45,
    "daysTracked": 42,
    "currentStreak": 5,
    "longestStreak": 12,
    "completionRate": 93
  }
}
```

---

## Google Calendar Endpoints

### Check Connection Status
Check if Google Calendar is connected.

**Endpoint:** `GET /calendar/status`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "connected": true,
  "email": "user@gmail.com"
}
```

### Import from Google Calendar
Import events from Google Calendar.

**Endpoint:** `POST /calendar/import`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Imported 15 events",
  "count": 15,
  "tasks": [ ... ]
}
```

### Export Task to Google Calendar
Export a single task to Google Calendar.

**Endpoint:** `POST /calendar/export/:taskId`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Task exported to Google Calendar",
  "eventId": "google_event_id",
  "eventLink": "https://calendar.google.com/..."
}
```

### Sync All Tasks
Sync all tasks with Google Calendar.

**Endpoint:** `POST /calendar/sync`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Synced 20 tasks with Google Calendar",
  "count": 20
}
```

### Delete Calendar Event
Delete a task's Google Calendar event.

**Endpoint:** `DELETE /calendar/event/:taskId`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Event deleted from Google Calendar"
}
```

---

## LLM Endpoints

### Get LLM Configuration
Check LLM configuration status.

**Endpoint:** `GET /llm/config`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "provider": "openai",
  "configured": true
}
```

### Set LLM Configuration
Configure LLM provider and API key.

**Endpoint:** `POST /llm/config`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "provider": "openai",
  "apiKey": "sk-your-api-key"
}
```

**Response:** `200 OK`
```json
{
  "message": "LLM configuration saved successfully",
  "provider": "openai"
}
```

### Remove LLM Configuration
Remove LLM configuration.

**Endpoint:** `DELETE /llm/config`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "LLM configuration removed successfully"
}
```

### Parse Natural Language Input
Parse natural language to create a task.

**Endpoint:** `POST /llm/parse`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "input": "Create a task for having lunch every day at 6PM",
  "context": {
    "lists": [
      { "id": "list_id", "name": "Personal" }
    ]
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "title": "Lunch",
    "description": "",
    "dueDate": null,
    "dueTime": "18:00",
    "priority": "none",
    "tags": ["meal"],
    "recurrence": {
      "enabled": true,
      "pattern": "daily",
      "interval": 1,
      "daysOfWeek": []
    },
    "subtasks": [],
    "needsClarification": false
  },
  "needsClarification": false,
  "clarificationQuestion": null
}
```

### Continue Conversation
Continue conversation for clarifications.

**Endpoint:** `POST /llm/chat`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "message": "High priority",
  "conversationHistory": [
    { "role": "user", "content": "Plan vacation" },
    { "role": "assistant", "content": "What priority?" }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { ... },
  "needsClarification": false,
  "clarificationQuestion": null,
  "assistantMessage": "Task is ready!"
}
```

### Generate Suggestions
Generate task suggestions based on context.

**Endpoint:** `POST /llm/suggest`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "context": "User has many work tasks"
}
```

**Response:** `200 OK`
```json
{
  "suggestions": [
    {
      "title": "Take a break",
      "description": "Rest for 15 minutes",
      "priority": "low",
      "tags": ["wellness"]
    }
  ]
}
```

---

## User Endpoints

### Get Preferences
Get user preferences.

**Endpoint:** `GET /user/preferences`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "preferences": {
    "theme": "light",
    "language": "en",
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
    }
  }
}
```

### Update Preferences
Update user preferences.

**Endpoint:** `PUT /user/preferences`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "preferences": {
    "theme": "dark",
    "pomodoroSettings": {
      "workDuration": 30
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "preferences": { ... }
}
```

### Change Password
Change user password.

**Endpoint:** `POST /user/change-password`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:** 
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

**Last Updated:** January 2024

