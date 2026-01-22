# Changelog

All notable changes to NovaDo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta] - 2026-01-21

### 🎉 Initial Beta Release

This is the first public beta release of NovaDo, a privacy-focused task management application with AI capabilities and Google Calendar integration.

### ✨ Added

#### Core Task Management
- Complete CRUD operations for tasks
- Task properties: title, description, priority (none/low/medium/high), status, tags, due dates
- Subtasks with independent completion tracking
- Task attachments (file uploads)
- Smart task duplication
- Bulk task operations (delete, complete, archive)
- Multi-criteria search and filtering
- Custom task lists with organization

#### Calendar Integration
- Two-way Google Calendar synchronization
- Multi-calendar support (sync multiple Google calendars)
- Four calendar view modes: Month, Week, Day, Agenda
- Visual drag-and-drop task rescheduling
- Timezone-aware event handling
- Event creation directly from calendar
- Calendar color customization
- Auto-refresh and manual sync options

#### AI Assistant
- Natural language task parsing ("Meeting with John tomorrow at 3pm")
- Three AI provider options: Google Gemini, Groq, OpenAI
- Chat-based productivity assistant
- Smart task suggestions
- Due date extraction from natural language
- Priority inference from task descriptions

#### Task Matrix
- Eisenhower Matrix view (Urgent/Important quadrants)
- Kanban board view with status columns
- List view with grouping options
- Drag-and-drop between quadrants/columns
- Quick task property editing
- Visual task organization

#### Habit Tracking
- Daily habit tracking with completion calendar
- Streak calculation (current and best streaks)
- Monthly completion visualization
- Habit statistics and consistency metrics
- Multiple habits per user
- Daily check-in system

#### Focus & Pomodoro
- Pomodoro timer with customizable durations
- Stopwatch mode for flexible work sessions
- Work/break cycle management
- Session history and statistics
- Daily/weekly/monthly focus time analytics
- Audio notifications for session completion

#### Statistics & Analytics
- Comprehensive dashboard with 6+ metric categories
- Task completion trends (daily, weekly, monthly)
- Productivity score calculation
- Habit consistency tracking
- Focus time analytics
- Visual charts and graphs
- Date range filtering

#### Theming & Customization
- 12 professionally designed themes
- Dark and light mode variants
- Custom themes: Default, Dark, Hacker, Ocean, Forest, Sunset, Nordic, Royal, Candy, Warm, Cool, Monochrome
- Profile banner customization
- Profile picture upload
- User preferences persistence

#### User Management & Security
- JWT-based authentication
- Secure user registration and login
- Password hashing
- Profile management
- User preferences (theme, default view, notifications)
- Session management

#### Technical Features
- RESTful API architecture
- Local-first data storage (Mongita database)
- Progressive Web App (PWA) capabilities
- Service Worker for offline support
- Web Push Notifications (VAPID)
- Responsive design (mobile, tablet, desktop)
- Keyboard shortcuts
- Accessibility features

### 🛠️ Technical Stack
- **Backend**: FastAPI (Python 3.10+), Pydantic, Mongita
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Authentication**: JWT tokens
- **Storage**: Embedded Mongita database
- **AI Integration**: Google Gemini, Groq, OpenAI APIs
- **External Services**: Google Calendar API, Web Push (VAPID)
- **Icons**: Lucide Icons

### 📦 Distribution
- Windows executable build (PyInstaller)
- Source code distribution
- GUI launcher for desktop experience

### 📚 Documentation
- Complete feature documentation
- REST API reference guide
- Developer setup and contribution guide
- Documentation index for navigation

---

## [Unreleased]

### Planned for v1.1
- Recurring tasks functionality
- Task templates
- Mobile apps (iOS/Android)
- Advanced automation rules
- Team collaboration features
- Custom widgets
- Enhanced reporting

### Under Consideration
- Third-party integrations (Slack, Notion, Todoist)
- Desktop applications (Electron)
- Plugin system
- Public API for integrations
- Multi-language support
- Cloud sync option (optional)

---

## Version History Summary

| Version | Release Date | Highlights |
|---------|-------------|------------|
| 1.0.0-beta | 2026-01-21 | Initial beta release with core features |

---

## Migration Guides

### From v0.x to v1.0

**Breaking Changes:**
- None (first public release)

**New Features:**
- All features are new in this release

**Data Migration:**
- No migration needed for new installations

---

## Support & Feedback

Found a bug or have a feature request? Please:
1. Check [existing issues](https://github.com/amnxlab/NovaDo/issues)
2. Create a [new issue](https://github.com/amnxlab/NovaDo/issues/new) with details
3. Join the [discussion](https://github.com/amnxlab/NovaDo/discussions)

---

**Note:** This is a test/beta release. Some features may have limitations or bugs. Please report any issues you encounter!
