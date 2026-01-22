# NovaDo v1.0 (Test Version) - Complete Feature Inventory

**Generated:** January 21, 2026  
**Project:** NovaDo - Smart Task Management with AI & Google Calendar Integration

---

## 📋 Table of Contents

1. [Task Management](#task-management)
2. [Calendar Integration](#calendar-integration)
3. [AI Features](#ai-features)
4. [Habit Tracking](#habit-tracking)
5. [Focus & Pomodoro](#focus--pomodoro)
6. [Statistics & Analytics](#statistics--analytics)
7. [Task Matrix](#task-matrix)
8. [Organization & Categorization](#organization--categorization)
9. [Theming & Customization](#theming--customization)
10. [User Management](#user-management)
11. [Data Management](#data-management)
12. [Notifications](#notifications)
13. [Search & Filtering](#search--filtering)
14. [UI/UX Features](#uiux-features)

---

## 🎯 Task Management

### Core Task Operations
- **Create Tasks**: Multiple ways to add tasks
  - Quick add input (press Enter to create)
  - Full task modal with advanced options
  - AI-powered natural language task creation
  - Import from Google Calendar as tasks
- **Edit Tasks**: Update all task properties including title, description, due date, priority, tags, and status
- **Delete Tasks**: Remove tasks with confirmation
- **Task Status Management**: 5 status states
  - `scheduled` - Default state for new tasks
  - `in_progress` - Task currently being worked on
  - `completed` - Task finished
  - `skipped` - Task won't be done
  - `todo` - Task to be scheduled
- **API Endpoints**:
  - `GET /api/tasks/` - Get all tasks with optional filters
  - `GET /api/tasks/{id}` - Get single task
  - `POST /api/tasks/` - Create new task
  - `PUT /api/tasks/{id}` - Update task
  - `DELETE /api/tasks/{id}` - Delete task

### Task Properties
- **Title**: Required task name
- **Description**: Optional detailed description
- **Due Date**: Optional date (YYYY-MM-DD format)
- **Due Time**: Optional time (HH:MM format, 24-hour)
- **Priority Levels**: 4 priority levels
  - None (0)
  - Low (1) - Green
  - Medium (2) - Yellow/Orange
  - High (3) - Red
- **Tags**: Multiple hierarchical tags support
- **List Assignment**: Associate task with a list
- **Subtasks**: Nested checklist items within tasks
- **Attachments**: File uploads (images, PDFs, documents, up to 5MB)
- **Recurrence**: Repeating task patterns (future feature)
- **Reminders**: Task reminder notifications

### Advanced Task Features
- **Drag and Drop**: Reorder tasks, move between lists, drag to calendar dates
- **Bulk Operations**: Multi-select and batch update (via filters)
- **Task Dependencies**: Track relationships between tasks (via references in description)
- **Completion Tracking**: Timestamp when tasks are completed
- **Task History**: Track when task started (`startedAt`) and completed (`completedAt`)
- **Google Calendar Integration**: Sync tasks to Google Calendar events
- **Pomodoro Sessions**: Link focus sessions to specific tasks

### Smart Lists (Built-in Filters)
- **Inbox**: Default catch-all list (auto-created)
- **Today**: Tasks due today
- **Next 7 Days**: Tasks due within the week
- **All Tasks**: View all active tasks
- **Completed**: View completed tasks
- **Won't Do**: View skipped tasks
- **Custom Lists**: User-created lists with icons and colors

---

## 📅 Calendar Integration

### Google Calendar Sync
- **OAuth 2.0 Authentication**: Secure Google login flow
- **Multi-Calendar Support**: Sync multiple Google Calendars
- **Calendar Selection**: Choose which calendars to sync
- **Two-Way Sync**: 
  - Import Google events as NovaDo tasks
  - Export NovaDo tasks to Google Calendar (planned)
- **Timezone Handling**: Automatic timezone conversion
  - Auto-detect browser timezone
  - Manual timezone selection from global list
  - UTC to local time conversion for events
- **API Endpoints**:
  - `GET /api/calendar/config` - Check configuration status
  - `GET /api/calendar/status` - Check connection status
  - `GET /api/calendar/auth` - Start OAuth flow
  - `GET /api/calendar/callback` - OAuth callback handler
  - `POST /api/calendar/disconnect` - Disconnect Google account
  - `GET /api/calendar/calendars` - List available calendars
  - `GET /api/calendar/events` - Fetch events from calendar
  - `POST /api/calendar/import` - Import calendar events as tasks
  - `POST /api/calendar/sync` - Sync calendars

### Calendar Views
- **Month View**: Traditional calendar grid with event cards
  - Day headers (Sun-Sat)
  - Previous/next month navigation
  - Today highlighting
  - Up to 3 events per day displayed
  - "+X more" indicator for overflow
- **Week View**: Hour-by-hour week grid
  - All 7 days with hourly slots
  - Overlapping event support (column-based layout)
  - Drag to reschedule events
- **Day View**: Detailed single-day timeline
  - 24-hour timeline (12 AM - 11 PM)
  - Event time display with duration
  - Enhanced event cards with color coding
  - Event tooltips on hover
- **Agenda View**: List-based upcoming events
  - Chronological event listing
  - Grouped by date
  - Filter by date range

### Calendar Features
- **Event Display**:
  - Color-coded events (theme-aware)
  - Google Calendar color preservation
  - Priority-based coloring for tasks
  - Status icons (✅ completed, ⏳ in progress, etc.)
  - Time stamps for events
- **Navigation**:
  - Previous/Next period buttons
  - Jump to Today button
  - View mode switching (Day/Week/Month/Agenda)
  - Period label displays current date range
- **Drag & Drop**: Move events between dates (documented feature)
- **Event Cards**: Enhanced visual design
  - Short-duration event optimization
  - Theme integration
  - Hover effects and tooltips
  - Click to open task details

---

## 🤖 AI Features

### Supported AI Providers
- **Google Gemini**: Free tier with `gemini-1.5-flash` model
- **Groq**: Free tier with `llama-3.1-8b-instant` model
- **OpenAI**: Paid tier with `gpt-3.5-turbo` model

### Natural Language Task Creation
- **Smart Parsing**: Convert natural language to structured tasks
  - Extract title, description, due date, priority, tags
  - Understand urgency keywords (urgent, ASAP, important, etc.)
  - Parse relative dates (tomorrow, next Monday, in 2 hours, etc.)
  - Parse specific times (at 3pm, 10:00, end of day)
- **System Prompt**: Specialized task extraction instructions
- **API Endpoints**:
  - `GET /api/llm/config` - Get LLM configuration status
  - `POST /api/llm/config` - Save LLM API key and provider
  - `DELETE /api/llm/config` - Remove LLM configuration
  - `POST /api/llm/parse` - Parse natural language into task
  - `POST /api/llm/chat` - Chat with AI assistant
  - `GET /api/llm/providers` - List available providers

### AI Task Suggestions
- **AI Resort Button**: Get AI recommendations in Task Matrix
- **Smart Input Modal**: Chat-style AI interaction
- **Context-Aware**: Uses current date/time for parsing

### Security
- **Encrypted Storage**: API keys encrypted with Fernet (SHA-256 derived key)
- **Decrypt on Use**: Keys decrypted only when making API calls
- **Environment Key**: `ENCRYPTION_KEY` in .env for key derivation

---

## 🔥 Habit Tracking

### Habit Features
- **Create Habits**: Define recurring habits to track
- **Habit Properties**:
  - Name: Habit title
  - Description: Optional details
  - Frequency: Daily, weekly, custom patterns
  - Target Days: Days per week goal
  - Target Count: Completions per day
  - Color: Visual identifier
  - Icon: Emoji or icon
  - Reminder: Optional notification time
- **Completion Tracking**:
  - Mark habit complete for specific dates
  - Multiple completions per day support
  - Completion count tracking
  - Notes per completion
- **Streaks**:
  - Current streak calculation
  - Longest streak tracking
  - Visual streak indicators
- **Habit Calendar**: 7-day grid showing completion status
- **Archive Habits**: Soft delete (isArchived flag)
- **API Endpoints**:
  - `GET /api/habits/` - Get all habits (with active filter)
  - `POST /api/habits/` - Create habit
  - `POST /api/habits/{id}/complete` - Mark complete
  - `DELETE /api/habits/{id}` - Delete habit

### Habit Statistics
- **Completion Rate**: Percentage of target days achieved
- **Daily Progress**: Today's completion status
- **Historical Data**: All completion dates stored
- **Motivation**: Streak-based encouragement

---

## 🍅 Focus & Pomodoro

### Timer Modes
- **Pomodoro Mode**: 
  - Configurable work duration (default 25 min)
  - Short breaks (default 5 min)
  - Long breaks (default 15 min after 4 sessions)
  - Sessions before long break (default 4)
- **Stopwatch Mode**: Open-ended focus tracking

### Pomodoro Features
- **Task Selection**: Link focus session to a specific task
- **Visual Timer**: Circular progress ring with countdown
- **Controls**:
  - Start/Pause/Resume
  - Exit (abandon session)
- **Settings Panel**: Configure timer durations
  - Focus duration (1-60 min)
  - Short break (1-30 min)
  - Long break (1-60 min)
  - Sessions count (1-10)
- **Session Tracking**: All sessions saved to database
  - Session type (pomo/stopwatch)
  - Task association
  - Duration
  - Start/end timestamps
  - Tags from associated task

### Focus Statistics
- **Today's Stats**:
  - Pomodoros completed today
  - Total focus duration today
- **Overall Stats**:
  - Total pomodoros all-time
  - Total focus time (hours + minutes)
- **Tag-Based Stats**: Focus time breakdown by tag
- **Focus Record**: Historical list of all sessions
  - Grouped by date
  - Task names and durations
  - Delete individual sessions
- **API Endpoints**:
  - `POST /api/focus/sessions` - Record completed session
  - `GET /api/focus/sessions` - Get session history (with date/limit filters)
  - `GET /api/focus/stats` - Get aggregated statistics
  - `DELETE /api/focus/sessions/{id}` - Delete session

---

## 📊 Statistics & Analytics

### Dashboard Views
- **Daily Snapshot**:
  - Focus time today
  - Tasks completed today
  - Current streak
  - Motivational avatar and message
  - Completion ring visualization
- **Weekly Trends**:
  - Line chart: Task completion over 7 days
  - Bar chart: Daily focus hours
  - AI-generated insights
- **Monthly Analytics**:
  - Total focus hours
  - Goal achievement percentage
  - Category breakdown
  - Activity heatmap
  - Simplified/Detailed mode toggle
- **Gamified Progress**:
  - User level and XP
  - Character avatar
  - Badges and achievements
  - Streak display
- **Insights Hub**:
  - Executive summary
  - Pattern detection
  - Productivity radar chart
  - Hourly heatmap
  - Productivity trends
  - AI predictions
- **Hyperfocus Mode**: Distraction-free statistics view

### Charts & Visualizations
- **Chart.js Integration**: Professional charts
  - Line charts (trends)
  - Bar charts (comparisons)
  - Doughnut charts (goal achievement)
  - Radar charts (multi-dimensional productivity)
- **Activity Heatmaps**: GitHub-style contribution graphs
- **Completion Rings**: Circular progress indicators
- **Trend Analysis**: Pattern detection in completion data

### AI-Powered Insights
- **Recommendation Engine**: Task prioritization suggestions
- **Pattern Recognition**: Detect productivity patterns
- **Predictions**: Forecast task completion likelihood
- **Motivational Messages**: Context-aware encouragement

### Statistics API
- **Endpoints**:
  - `GET /api/stats/` - Get comprehensive stats
  - `GET /api/stats/monthly` - Monthly aggregated data
  - `GET /api/stats/habits` - Habit-specific statistics

### Streak Calculation
- **Daily Streak**: Consecutive days with completed tasks
- **Safety Limit**: Max 365 days to prevent infinite loops
- **Grace Period**: Allows today to not be completed yet

---

## 🎯 Task Matrix

### Eisenhower Matrix Implementation
- **Four-Dimensional Classification**:
  - Priority (High/Medium/Low)
  - Status (Todo/In Progress/Scheduled/Completed/Skipped)
  - Energy Level (High/Medium/Low) OR Time of Day (Morning/Afternoon/Evening)
  - Tags

### Matrix Views
- **Kanban Board**: Column-based drag-and-drop
  - Organize by status or priority
  - Visual task cards
  - Column headers with counts
- **Smart List**: Filtered table view
  - Sortable columns
  - Bulk selection
  - Quick filters
- **Dashboard**: Overview with metrics
  - Task distribution charts
  - Priority breakdown
  - Status summary

### Matrix Features
- **Focus Mode**: Minimize distractions, highlight important tasks
- **Filter Bar**: 
  - Priority chips (High/Medium/Low)
  - Status chips (all 5 statuses)
  - Tag selection (hierarchical tags)
  - Fourth dimension filters (energy/time)
  - Active filter count badge
  - 150ms debounce on filter updates
- **4D Toggle**: Switch between Energy Level and Time of Day
- **AI Resort**: AI-powered task reorganization suggestions
- **Drag & Drop**: Reorder and reclassify tasks
- **Keyboard Shortcuts**: Quick navigation and actions
- **Preferences**:
  - Animations enabled/disabled
  - Sound effects
  - Calm mode (reduced motion)
  - Animation speed (slow/normal/fast)
- **Accessibility**: 
  - ARIA labels
  - Keyboard navigation
  - Screen reader support
  - Respects `prefers-reduced-motion`

### Matrix Banner
- **Custom Banner Image**: User-uploaded background
- **Focal Point Adjustment**: Position focal point (X: 0-100%, Y: 0-100%)
- **Upload Constraints**:
  - Max 5MB
  - Formats: JPEG, PNG, GIF, WebP
  - Auto-delete old banner on new upload
- **API Endpoints**:
  - `POST /api/banner/` - Upload banner image
  - `PUT /api/banner/settings` - Update focal point
  - `DELETE /api/banner/` - Remove banner

---

## 🏷️ Organization & Categorization

### Hierarchical Tag System
- **Parent-Child Relationships**: 
  - Tags can have parent tags
  - Full path notation (e.g., `work:projects:novado`)
  - Unlimited nesting depth
- **Tag Properties**:
  - Name: Tag label
  - Full Path: Complete hierarchy (auto-generated)
  - Parent ID: Reference to parent tag
  - Color: Visual identifier
  - Icon: Emoji or symbol
  - Order: Display order
- **Auto-Discovery**: Tags used in tasks automatically appear
  - Discovered tags marked with `isDiscovered: true`
  - Cannot rename/delete discovered tags until explicitly created
  - Gray color for discovered tags
- **Task Counting**: 
  - Direct count (tasks with this exact tag)
  - Total count (parent tags include children)
- **Regex Search**: Find tasks with tag or child tags (`^parent:`)
- **API Endpoints**:
  - `GET /api/tags/` - Get all tags (includes discovered)
  - `POST /api/tags/` - Create tag
  - `PUT /api/tags/{id}` - Update tag (renames child tags too)
  - `DELETE /api/tags/{id}` - Delete tag

### Custom Lists
- **List Properties**:
  - Name: List title
  - Color: Hex color code
  - Icon: Emoji or icon name
  - Order: Display sequence
  - Parent: Nested lists (optional)
  - Smart Filter: Automatic filtering rules
- **Default Lists**: Auto-created on registration
  - Inbox (blue, 📥)
  - Today (green, 📅)
  - Next 7 Days (yellow, 🗓️)
  - All (purple, 📋)
  - Completed (teal, ✅)
- **Smart Lists**: Dynamic filters
  - Filter by due date, status, priority, tags
  - Auto-update when tasks change
- **List Management**:
  - Create custom lists
  - Rename, recolor, re-icon
  - Reorder lists (drag & drop)
  - Archive lists
  - Delete lists (moves tasks to Inbox)
  - Cannot delete default lists
- **Task Count**: Live count of non-completed tasks per list
- **API Endpoints**:
  - `GET /api/lists/` - Get all lists
  - `POST /api/lists/` - Create list
  - `PUT /api/lists/{id}` - Update list
  - `DELETE /api/lists/{id}` - Delete list

---

## 🎨 Theming & Customization

### Theme System
- **12 Professional Themes**: 5 light + 7 dark themes
  - **Light Themes**:
    1. Classic Productivity (default light)
    2. Pastel Calm
    3. Warm Earth
    4. Crisp Nordic
    5. Energetic Sunrise
  - **Dark Themes**:
    1. Midnight Minimal (default dark)
    2. Deep Ocean
    3. Charcoal Elegance
    4. Neon Pulse
    5. Forest Dusk
    6. Stormy Void
    7. Warm Ember
    8. Cyber Twilight
    9. Hacker (bonus theme)

### Theme Architecture
- **CSS Custom Properties**: Modern variable-based system
- **Design Tokens**:
  - 8px grid spacing scale
  - Typography system (Inter + JetBrains Mono)
  - Font size scale (xs to 4xl)
  - Font weight scale (300-700)
  - Border radius (4px to full circle)
  - Animation durations & easings
  - Layout constants (sidebar width, header height)
- **Color Variables**:
  - Background (primary, secondary, tertiary, hover, active, sidebar)
  - Text (primary, secondary, muted, light)
  - Accent colors (primary, secondary, light, gradient)
  - Status colors (success, warning, error with light variants)
  - Priority colors (high, medium, low)
  - Border colors
  - Shadows (xs, sm, md, lg, xl, glow)
- **Event Palette**: 10 vibrant colors for calendar events
- **Smooth Transitions**: Theme switching with CSS transitions
- **Theme Persistence**: Saved to localStorage
- **No Flash**: Pre-load theme before render

### Customization Options
- **Sidebar Configuration**:
  - Show/hide smart lists
  - Show/hide tools
  - Show/hide task status items
  - Rename sidebar items (custom labels)
  - Reorder items (drag & drop)
  - Version-tracked config (schema migrations)
- **User Preferences** (stored per user):
  - Theme selection
  - Language (en - extensible)
  - Timezone
  - Notification settings
  - Pomodoro timer settings
- **Avatar Upload**: Custom profile picture
  - Stored in localStorage
  - Max 5MB
  - Image formats only
  - Circular display

### UI Customization
- **Sidebar Resize**: Draggable sidebar edge
- **Compact Mode**: Collapsible sidebar for mobile
- **Focus Mode**: Hide distractions in Task Matrix
- **Lucide Icons**: Modern SVG icon library (auto-initialized)
- **Responsive Design**: Mobile-friendly layouts

---

## 👤 User Management

### Authentication
- **Registration**: Email + password signup
  - Name, email, password fields
  - Password min length: 6 characters
  - Email uniqueness validation
  - Auto-creates default lists on signup
  - Returns JWT token
- **Login**: Email + password authentication
  - Returns JWT token
  - Token stored in localStorage
  - Auto-login on app load if token exists
- **Logout**: Clear token and redirect to auth screen
- **Session Management**: JWT-based authentication
  - Token in Authorization header
  - Token validation on all API requests
  - Auto-logout on invalid token

### User Profile
- **Profile Data**:
  - Name
  - Email
  - Avatar (uploaded image or emoji)
  - Google ID (if connected to Google)
  - Google access/refresh tokens
  - LLM provider and encrypted API key
  - Preferences object
  - Push notification subscription
  - Account status (verified, active)
  - Statistics (total tasks completed, streaks)
- **Profile Editing**:
  - Update name
  - Update email
  - Change password (requires current password)
  - Upload avatar
- **API Endpoints**:
  - `POST /api/auth/register` - Create account
  - `POST /api/auth/login` - Sign in
  - `GET /api/auth/me` - Get current user
  - `PUT /api/auth/profile` - Update profile
  - `POST /api/user/change-password` - Change password
  - `GET /api/user/preferences` - Get preferences
  - `PUT /api/user/preferences` - Update preferences

### User Statistics
- **Tracked Metrics**:
  - Total tasks completed
  - Current completion streak
  - Longest completion streak
  - Last completion date
- **Auto-Incremented**: Stats update on task completion

---

## 💾 Data Management

### Database
- **Mongita**: MongoDB-like file-based database
  - NoSQL document storage
  - Lightweight, no separate server needed
  - Stores data in `data/` directory
  - Collections: users, tasks, lists, tags, habits, focus_sessions, push_subscriptions, oauth_states

### Data Models
- **Users**: Authentication, profile, preferences, integrations
- **Tasks**: Full task data with relationships to lists and tags
- **Lists**: Organization buckets for tasks
- **Tags**: Hierarchical tag tree
- **Habits**: Recurring habit tracking
- **Focus Sessions**: Pomodoro/stopwatch session records
- **Push Subscriptions**: Web push notification endpoints
- **OAuth States**: Temporary Google OAuth flow states

### File Uploads
- **Attachment Storage**: Files stored in `uploads/` directory
- **Banner Storage**: User banners in `uploads/banners/`
- **Metadata Tracking**: File records in database with user association
- **File Constraints**:
  - Max 5MB per file
  - Allowed types: Images (JPEG, PNG, GIF, WebP), PDFs, Docs (DOC, DOCX), Text (TXT), Archives (ZIP)
- **Unique Filenames**: UUID-based naming to prevent conflicts
- **API Endpoints**:
  - `POST /api/uploads/` - Upload file attachment
  - `GET /api/uploads/{file_id}` - Download file

### Data Persistence
- **LocalStorage**: Client-side storage
  - Auth token
  - Theme preference
  - Sidebar configuration
  - User avatar (base64)
  - Matrix preferences
  - Current view state
- **Database**: Server-side persistent storage
  - All user data
  - Tasks, lists, tags, habits
  - Focus sessions
  - OAuth states

### Backup & Export
- **Statistics Export**: Download stats data (planned feature)
- **Task Export**: Export to CSV/JSON (planned)

---

## 🔔 Notifications

### Push Notifications
- **Web Push**: Browser-based push notifications
- **VAPID Keys**: Voluntary Application Server Identification
  - Public/private key pair in environment
  - Secure push authentication
- **Subscription Management**:
  - Subscribe to push notifications
  - Unsubscribe
  - Check subscription status
- **Notification Payload**:
  - Title, body, icon
  - Tag for grouping
  - Custom data
  - Actions (buttons)
  - Require interaction flag
- **API Endpoints**:
  - `GET /api/notifications/vapid-key` - Get public key
  - `POST /api/notifications/subscribe` - Save subscription
  - `POST /api/notifications/unsubscribe` - Remove subscription
  - `GET /api/notifications/status` - Check subscription status

### Notification Settings
- **User Preferences**:
  - Email notifications (toggle)
  - Push notifications (toggle)
  - Task reminders (toggle)
- **Browser Permission**: Request notification permission on enable

### Service Worker
- **sw.js**: Registers push notification handlers
- **Offline Support**: Basic PWA capabilities (planned)

---

## 🔍 Search & Filtering

### Task Search
- **Quick Search Bar**: Header search input
  - Searches task titles
  - Searches task descriptions
  - Searches tags
  - Case-insensitive regex matching
  - Debounced (300ms) for performance
- **Advanced Filters**:
  - Filter by list
  - Filter by status
  - Filter by priority
  - Filter by tag
  - Filter by due date (today, next 7 days, overdue)
- **Combined Filters**: Multiple filters applied together
- **API Parameter**: `search` query parameter on `GET /api/tasks/`

### Task Matrix Filters
- **Multi-Select Filters**:
  - Priority checkboxes (high, medium, low)
  - Status checkboxes (all 5 statuses)
  - Tag multi-select
  - Fourth dimension (energy/time) filters
- **Active Filter Count**: Badge shows number of active filters
- **Clear All Filters**: Reset all selections
- **Debounced Updates**: 150ms debounce to prevent lag
- **Accessibility**: ARIA labels and roles for filter chips

### Calendar Filters
- **Date Range**: Navigate to specific periods
- **View Mode**: Filter by day/week/month/agenda
- **Calendar Selection**: Choose which Google Calendars to display

---

## 💻 UI/UX Features

### Responsive Design
- **Mobile-First**: Optimized for small screens
- **Menu Toggle**: Hamburger menu for mobile navigation
- **Sidebar Collapse**: Hide sidebar on narrow screens
- **Touch-Friendly**: Large tap targets, swipe gestures

### Modals & Dialogs
- **Task Modal**: Full-featured task editor
  - Form fields for all task properties
  - Subtask management
  - Attachment upload
  - Date/time pickers with `showPicker()` API
  - Close on overlay click or Escape key
- **List Modal**: Create/edit lists
- **Habit Modal**: Create/edit habits
- **Smart Input Modal**: AI chat interface
- **Rename Modal**: Rename sidebar items
- **Add Sidebar Modal**: Add items to sidebar sections

### Visual Feedback
- **Toast Notifications**: Success/error messages
  - Auto-dismiss after 3 seconds
  - Color-coded (green success, red error)
- **Loading States**: Skeleton screens and spinners
- **Progress Indicators**: Upload progress, timer countdown
- **Hover Effects**: Interactive element highlighting
- **Animations**: Smooth transitions (respects `prefers-reduced-motion`)
- **Confetti**: Celebration animations on achievements

### Keyboard Shortcuts
- **F**: Toggle Focus Mode in Task Matrix
- **Escape**: Close modals
- **Enter**: Submit forms, quick-add tasks
- **Arrow Keys**: Navigate Task Matrix (planned)

### Accessibility
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA Labels**: Screen reader descriptions
- **Keyboard Navigation**: All features accessible via keyboard
- **Focus Management**: Logical focus order, visible focus indicators
- **Color Contrast**: WCAG AA compliant
- **Motion Preferences**: Respects `prefers-reduced-motion` media query
- **Alt Text**: All images have descriptive alt attributes

### Performance Optimizations
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Debounced Filters**: 150ms delay in Task Matrix
- **Lazy Icon Loading**: Lucide icons loaded on demand
- **Chart Caching**: Statistics charts cached for 60 seconds
- **Virtual Scrolling**: Planned for large task lists
- **Indexed DB**: Planned for offline caching

### Developer Experience
- **Console Logging**: Detailed debug logs in development
- **Error Handling**: Try-catch blocks with user-friendly messages
- **API Client**: Centralized API wrapper (`api.js`)
- **Modular Architecture**: Separate modules (app, api, statistics, taskMatrix)
- **Code Comments**: Inline documentation and JSDoc

---

## 🔧 Technical Implementation

### Frontend Stack
- **HTML5**: Semantic markup
- **CSS3**: Modern features (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript**: No framework dependencies
- **Lucide Icons**: SVG icon library
- **Chart.js**: Data visualization
- **Canvas Confetti**: Celebration effects

### Backend Stack
- **FastAPI**: Python async web framework
- **Pydantic**: Data validation and serialization
- **Mongita**: Embedded MongoDB-like database
- **JWT**: JSON Web Tokens for authentication
- **Cryptography**: Fernet encryption for API keys
- **Google APIs**: OAuth2, Calendar API, Gmail API (planned)
- **HTTPX**: Async HTTP client for LLM APIs

### Security
- **Password Hashing**: bcrypt via passlib
- **JWT Secrets**: Environment-based secret keys
- **API Key Encryption**: Fernet symmetric encryption
- **CORS**: Configured for local development
- **Input Validation**: Pydantic models, ObjectId validation
- **SQL Injection Protection**: NoSQL document database (no SQL)
- **XSS Protection**: HTML escaping in templates

### Deployment
- **Local Server**: uvicorn ASGI server
- **Desktop App**: GUI launcher with tkinter
- **Executable**: PyInstaller packaging (NovaDo.exe)
- **Port**: Default 5000 (configurable)
- **Auto-Open Browser**: Automatic URL launch on startup

---

## 📦 Dependencies

### Python Requirements
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
python-dotenv==1.0.0
mongita==1.1.1
google-auth==2.26.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.114.0
httpx==0.26.0
cryptography==41.0.7
pytz==2023.3
```

### Frontend CDN Libraries
- **Lucide**: https://unpkg.com/lucide@latest
- **Chart.js**: https://cdn.jsdelivr.net/npm/chart.js@4.4.0
- **Confetti**: https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2
- **Google Fonts**: Inter (sans), JetBrains Mono (monospace)

---

## 🎯 Feature Completeness Summary

### ✅ Fully Implemented (Production-Ready)
- Task CRUD operations
- List and tag management
- Habit tracking with streaks
- Pomodoro timer with session tracking
- Google Calendar OAuth and import
- Multi-theme system
- User authentication
- AI-powered task parsing (3 providers)
- Statistics dashboard with 6 views
- Task Matrix with filters
- Search functionality
- Calendar views (4 modes)
- Push notifications infrastructure
- File uploads and attachments
- Sidebar customization
- Timezone handling
- Responsive mobile UI

### 🚧 Partially Implemented (Needs Enhancement)
- Two-way Google Calendar sync (import works, export planned)
- Task recurrence (data model exists, UI pending)
- Badge system (structure exists, achievements TBD)
- Offline support (service worker registered, caching TBD)

### 📋 Planned Features (Not Yet Implemented)
- Task dependencies visualization
- Email notifications (infrastructure exists)
- Collaboration features
- Advanced statistics export
- Custom chart builder
- Task templates
- Voice input for tasks
- Mobile app (currently web-based)

---

## 🎓 How to Use Key Features

### Quick Start
1. **Register** with email and password
2. **Add tasks** using quick input or AI natural language
3. **Organize** with lists and tags
4. **Track time** using Pomodoro timer
5. **Visualize** productivity in Statistics view
6. **Sync** Google Calendar for unified schedule

### AI Task Creation
1. Click AI chat button (floating button)
2. Enter natural language: "Meeting with John tomorrow at 3pm high priority #work"
3. AI parses and creates structured task
4. Requires: LLM provider configured in Settings

### Google Calendar Sync
1. Settings → Google Calendar → Connect
2. Authorize with Google account
3. Select calendars to sync
4. Click "Import Calendar" to pull events
5. Events appear as tasks with sync indicator

### Task Matrix Power Use
1. View all tasks in Kanban/List/Dashboard modes
2. Filter by priority, status, tags, energy level
3. Drag tasks to reclassify or reorder
4. Use Focus Mode to minimize distractions
5. Let AI suggest optimal task ordering

### Habit Tracking Workflow
1. Create habit with target frequency
2. Mark complete each day from Habits view
3. Watch streak counter grow
4. View completion calendar
5. Track completion rate over time

---

## 📊 API Endpoint Reference

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks/` - List tasks (filters: list, status, priority, tag, search, dueDate)
- `GET /api/tasks/{id}` - Get task
- `POST /api/tasks/` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Lists
- `GET /api/lists/` - Get all lists
- `POST /api/lists/` - Create list
- `PUT /api/lists/{id}` - Update list
- `DELETE /api/lists/{id}` - Delete list

### Tags
- `GET /api/tags/` - Get all tags (includes auto-discovered)
- `POST /api/tags/` - Create tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag

### Habits
- `GET /api/habits/` - Get habits (filter: isActive)
- `POST /api/habits/` - Create habit
- `POST /api/habits/{id}/complete` - Mark complete
- `DELETE /api/habits/{id}` - Delete habit

### Focus/Pomodoro
- `POST /api/focus/sessions` - Save session
- `GET /api/focus/sessions` - Get history (params: limit, days)
- `GET /api/focus/stats` - Get statistics
- `DELETE /api/focus/sessions/{id}` - Delete session

### Statistics
- `GET /api/stats/` - Main statistics
- `GET /api/stats/monthly` - Monthly data
- `GET /api/stats/habits` - Habit statistics

### AI/LLM
- `GET /api/llm/config` - Get config status
- `POST /api/llm/config` - Set API key and provider
- `DELETE /api/llm/config` - Remove config
- `POST /api/llm/parse` - Parse natural language
- `POST /api/llm/chat` - Chat with AI

### Google Calendar
- `GET /api/calendar/config` - Check if configured
- `GET /api/calendar/status` - Connection status
- `GET /api/calendar/auth` - Start OAuth
- `GET /api/calendar/callback` - OAuth callback
- `POST /api/calendar/disconnect` - Disconnect
- `GET /api/calendar/calendars` - List calendars
- `GET /api/calendar/events` - Fetch events
- `POST /api/calendar/import` - Import as tasks
- `POST /api/calendar/sync` - Sync calendars

### User
- `GET /api/user/preferences` - Get preferences
- `PUT /api/user/preferences` - Update preferences
- `POST /api/user/change-password` - Change password

### Notifications
- `GET /api/notifications/vapid-key` - Get public key
- `POST /api/notifications/subscribe` - Subscribe
- `POST /api/notifications/unsubscribe` - Unsubscribe
- `GET /api/notifications/status` - Check status

### Uploads
- `POST /api/uploads/` - Upload file
- `GET /api/uploads/{file_id}` - Download file

### Banner
- `POST /api/banner/` - Upload banner
- `PUT /api/banner/settings` - Update focal point
- `DELETE /api/banner/` - Remove banner

---

## 🎨 Theme Reference

### Available Themes
**Light Themes:**
- `classic-productivity` / `light` - Professional clarity
- `pastel-calm` - Muted tones for focus
- `warm-earth` - Natural warmth
- `crisp-nordic` - Clean minimalism
- `energetic-sunrise` - Vibrant energy

**Dark Themes:**
- `midnight-minimal` / `dark` - Deep elegance
- `deep-ocean` - Oceanic depth
- `charcoal-elegance` - Sophisticated gray
- `neon-pulse` - Cyberpunk vibes
- `forest-dusk` - Natural greens
- `stormy-void` - Dramatic contrast
- `warm-ember` - Cozy orange tones
- `cyber-twilight` - Tech aesthetic
- `hacker` - Matrix-inspired (bonus)

### How to Switch Themes
1. Settings → Appearance
2. Click theme card
3. Theme applies instantly
4. Saved to localStorage and user preferences

---

## 🏆 Credits & Attribution

**Project**: NovaDo v1.0 (Test Version)  
**Architecture**: FastAPI + Vanilla JS + Mongita  
**Icon Library**: Lucide Icons  
**Charts**: Chart.js  
**Fonts**: Google Fonts (Inter, JetBrains Mono)  
**AI Providers**: Google Gemini, Groq, OpenAI

---

## 📄 License

Refer to project LICENSE file for usage terms.

---

**Document Version**: 1.0  
**Last Updated**: January 21, 2026  
**Generated By**: GitHub Copilot AI Assistant
