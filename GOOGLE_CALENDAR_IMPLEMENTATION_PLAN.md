# Google Calendar Integration - Full Implementation Plan

## Overview
Implement Google Calendar OAuth integration that allows users to connect their Google Calendar account and automatically import events as tasks. The flow should be simple: Connect → Authorize → Auto-Import → Done (similar to Todoist).

## Requirements

### Functional Requirements
1. User can connect Google Calendar via OAuth 2.0
2. After authorization, events are automatically imported as tasks (last 30 days, next 90 days)
3. User can manually sync new events
4. User can disconnect Google Calendar
5. Imported events appear in the calendar view
6. Events are tagged with "google-calendar" tag

### Technical Requirements
- Backend: FastAPI with Google OAuth 2.0
- Frontend: Vanilla JavaScript
- Database: MongoDB/Mongita (store OAuth tokens and imported event IDs)
- OAuth Scopes: Calendar read-only access

## Backend Implementation

### 1. Dependencies
Add to `requirements.txt`:
```
google-auth>=2.25.0
google-auth-oauthlib>=1.2.0
google-auth-httplib2>=0.2.0
google-api-python-client>=2.108.0
```

### 2. Environment Variables
Add to `.env` file:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

### 3. Database Schema Changes

#### User Collection Updates
Add fields to user document:
```python
{
    "googleAccessToken": str,  # OAuth access token
    "googleRefreshToken": str,  # OAuth refresh token
    "googleEmail": str,  # User's Google email
    "googleConnectedAt": datetime,  # When connected
    "lastCalendarSync": datetime  # Last sync timestamp
}
```

#### Task Collection Updates
Add fields to task document:
```python
{
    "googleEventId": str,  # Google Calendar event ID (to prevent duplicates)
    "googleCalendarId": str,  # Which calendar it came from
    "tags": ["google-calendar"]  # Tag to identify imported events
}
```

### 4. Backend Routes (`app/routes/calendar.py`)

#### Route 1: Get Configuration Status
```python
@router.get("/config")
async def get_calendar_config():
    """Check if Google Calendar is configured"""
    is_configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    return {
        "configured": is_configured,
        "message": "..." 
    }
```

#### Route 2: Get Connection Status
```python
@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Check if user has connected Google Calendar"""
    is_connected = bool(
        current_user.get("googleAccessToken") and
        current_user.get("googleRefreshToken")
    )
    return {
        "connected": is_connected,
        "email": current_user.get("googleEmail"),
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    }
```

#### Route 3: Start OAuth Flow
```python
@router.get("/auth")
async def start_google_auth(current_user: dict = Depends(get_current_user)):
    """Generate OAuth authorization URL"""
    # Create OAuth flow
    flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=GOOGLE_REDIRECT_URI)
    
    # Generate authorization URL
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    
    # Store state with user ID (use database or in-memory cache)
    oauth_states[state] = {
        "user_id": str(current_user["_id"]),
        "created_at": datetime.now()
    }
    
    return {
        "authorization_url": authorization_url,
        "state": state
    }
```

**OAuth Scopes Required:**
```python
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]
```

#### Route 4: OAuth Callback (Auto-Import)
```python
@router.get("/callback")
async def google_auth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None)
):
    """Handle OAuth callback and auto-import events"""
    
    # 1. Validate state and exchange code for tokens
    state_data = oauth_states.get(state)
    if not state_data:
        return RedirectResponse(url="/?google_auth=error&message=Invalid state")
    
    user_id = state_data["user_id"]
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # 2. Get user info from Google
    service = build("oauth2", "v2", credentials=credentials)
    user_info = service.userinfo().get().execute()
    
    # 3. Save tokens to database
    db = get_database()
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "googleAccessToken": credentials.token,
            "googleRefreshToken": credentials.refresh_token,
            "googleEmail": user_info.get("email"),
            "googleConnectedAt": datetime.now()
        }}
    )
    
    # 4. AUTO-IMPORT: Fetch events and create tasks
    calendar_service = build("calendar", "v3", credentials=credentials)
    
    # Get events: last 30 days, next 90 days
    now = datetime.utcnow()
    time_min = (now - timedelta(days=30)).isoformat() + "Z"
    time_max = (now + timedelta(days=90)).isoformat() + "Z"
    
    events_result = calendar_service.events().list(
        calendarId="primary",
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy="startTime",
        maxResults=500
    ).execute()
    
    events = events_result.get("items", [])
    imported_count = 0
    
    for event in events:
        # Parse event date/time
        start = event.get("start", {})
        is_all_day = "date" in start
        
        if is_all_day:
            start_dt = datetime.fromisoformat(start["date"])
            due_time = None
        else:
            start_str = start.get("dateTime", "")
            if start_str:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                due_time = start_dt.strftime("%H:%M")
            else:
                continue
        
        google_event_id = event.get("id")
        
        # Check if already imported (prevent duplicates)
        existing = db.tasks.find_one({
            "user": user_id,
            "googleEventId": google_event_id
        })
        
        if existing:
            continue
        
        # Create task from event
        task_doc = {
            "title": event.get("summary", "Untitled"),
            "description": event.get("description", ""),
            "user": user_id,
            "list": None,
            "dueDate": start_dt,
            "dueTime": due_time,
            "priority": "none",
            "status": "scheduled",
            "tags": ["google-calendar"],
            "subtasks": [],
            "attachments": [],
            "order": 0,
            "createdByAI": False,
            "googleEventId": google_event_id,
            "googleCalendarId": "primary",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        
        db.tasks.insert_one(task_doc)
        imported_count += 1
    
    # Update last sync time
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"lastCalendarSync": datetime.utcnow()}}
    )
    
    # Redirect back to app with success
    return RedirectResponse(
        url=f"/?google_auth=success&imported={imported_count}",
        status_code=302
    )
```

#### Route 5: Disconnect
```python
@router.post("/disconnect")
async def disconnect_google(current_user: dict = Depends(get_current_user)):
    """Remove Google Calendar connection"""
    db = get_database()
    db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$unset": {
            "googleAccessToken": "",
            "googleRefreshToken": "",
            "googleEmail": "",
            "googleConnectedAt": "",
            "lastCalendarSync": ""
        }}
    )
    return {"message": "Google Calendar disconnected"}
```

#### Route 6: Manual Sync
```python
@router.post("/sync")
async def sync_calendar(current_user: dict = Depends(get_current_user)):
    """Sync new events since last sync"""
    # Get credentials
    creds = get_credentials_from_user(current_user)
    if not creds:
        raise HTTPException(400, "Not connected")
    
    # Get events since last sync (or last 7 days if never synced)
    last_sync = current_user.get("lastCalendarSync")
    if last_sync:
        time_min = last_sync.isoformat() + "Z"
    else:
        time_min = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
    
    time_max = (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z"
    
    # Fetch and import new events (same logic as callback)
    # ... (similar to callback import logic)
    
    # Update last sync time
    db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"lastCalendarSync": datetime.utcnow()}}
    )
    
    return {"message": f"Synced {synced_count} new events", "count": synced_count}
```

### 5. Helper Functions

#### Get OAuth Flow
```python
def get_oauth_flow():
    """Create OAuth flow with client config"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return None
    
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )
    return flow
```

#### Get Credentials from User
```python
def get_credentials_from_user(user: dict) -> Optional[Credentials]:
    """Get Google credentials and refresh if expired"""
    if not user.get("googleAccessToken"):
        return None
    
    creds = Credentials(
        token=user.get("googleAccessToken"),
        refresh_token=user.get("googleRefreshToken"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES
    )
    
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        # Update tokens in database
        db = get_database()
        db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": {
                "googleAccessToken": creds.token,
                "googleRefreshToken": creds.refresh_token
            }}
        )
    
    return creds
```

### 6. Register Router
In `main.py`:
```python
from app.routes import calendar

app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
```

## Frontend Implementation

### 1. API Client Methods (`static/js/api.js`)

Add to API class:
```javascript
// Google Calendar
async getCalendarConfig() {
    return this.request('/calendar/config');
}

async getCalendarStatus() {
    return this.request('/calendar/status');
}

async startGoogleAuth() {
    return this.request('/calendar/auth');
}

async disconnectGoogle() {
    return this.request('/calendar/disconnect', {
        method: 'POST'
    });
}

async syncCalendar() {
    return this.request('/calendar/sync', {
        method: 'POST'
    });
}
```

### 2. UI HTML (`static/index.html`)

Add to Settings section:
```html
<div class="settings-section">
    <h2>📅 Google Calendar</h2>
    <p class="settings-description">Connect your Google Calendar to automatically import events and keep everything in sync.</p>
    <div id="google-calendar-settings">
        <!-- Not Configured State -->
        <div id="gcal-not-configured" class="gcal-status hidden">
            <div class="status-badge warning">⚠️ Not Configured</div>
            <p>Google Calendar integration requires setup. Add your Google OAuth credentials to the .env file:</p>
            <code class="code-block">
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
            </code>
            <p><a href="https://console.cloud.google.com/apis/credentials" target="_blank">Get credentials from Google Cloud Console →</a></p>
        </div>
        
        <!-- Disconnected State -->
        <div id="gcal-disconnected" class="gcal-status hidden">
            <div class="status-badge neutral">Not Connected</div>
            <p>Click below to connect your Google Calendar. Your events will be automatically imported as tasks.</p>
            <button class="btn btn-primary" id="connect-google-btn">
                <span class="google-icon">G</span> Connect Google Calendar
            </button>
        </div>
        
        <!-- Connected State -->
        <div id="gcal-connected" class="gcal-status hidden">
            <div class="status-badge success">✓ Connected</div>
            <p>Connected as: <strong id="gcal-email"></strong></p>
            <p class="settings-description" style="margin-top: 0.5rem;">Your calendar events are automatically synced. New events will appear as tasks.</p>
            <div class="gcal-actions">
                <button class="btn btn-secondary" id="sync-calendar-btn">🔄 Sync Now</button>
                <button class="btn btn-outline danger" id="disconnect-google-btn">Disconnect</button>
            </div>
        </div>
    </div>
</div>
```

### 3. JavaScript Functions (`static/js/app.js`)

#### Load Status Function
```javascript
async function loadGoogleCalendarStatus() {
    try {
        const config = await api.getCalendarConfig();
        const status = await api.getCalendarStatus();
        
        const notConfigured = document.getElementById('gcal-not-configured');
        const disconnected = document.getElementById('gcal-disconnected');
        const connected = document.getElementById('gcal-connected');
        
        if (!config.configured) {
            notConfigured?.classList.remove('hidden');
            disconnected?.classList.add('hidden');
            connected?.classList.add('hidden');
            return;
        }
        
        notConfigured?.classList.add('hidden');
        
        if (status.connected) {
            disconnected?.classList.add('hidden');
            connected?.classList.remove('hidden');
            const emailEl = document.getElementById('gcal-email');
            if (emailEl) emailEl.textContent = status.email || 'Connected';
        } else {
            disconnected?.classList.remove('hidden');
            connected?.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to load Google Calendar status:', error);
    }
}
```

#### Connect Function
```javascript
async function connectGoogleCalendar() {
    try {
        const response = await api.startGoogleAuth();
        
        if (response.authorization_url) {
            // Redirect directly to Google OAuth (like Todoist)
            window.location.href = response.authorization_url;
        }
    } catch (error) {
        console.error('Connect Google Calendar error:', error);
        showToast(error.message || 'Failed to connect Google Calendar', 'error');
    }
}
```

#### Disconnect Function
```javascript
async function disconnectGoogleCalendar() {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
        return;
    }
    
    try {
        await api.disconnectGoogle();
        loadGoogleCalendarStatus();
        showToast('Google Calendar disconnected', 'success');
    } catch (error) {
        console.error('Disconnect error:', error);
        showToast('Failed to disconnect', 'error');
    }
}
```

#### Sync Function
```javascript
async function syncGoogleCalendar() {
    try {
        showToast('Syncing calendar...', 'info');
        const response = await api.syncCalendar();
        
        if (response.count > 0) {
            await loadData(); // Reload tasks
            showToast(`Synced ${response.count} new events`, 'success');
        } else {
            showToast('No new events to sync', 'info');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showToast(error.message || 'Failed to sync calendar', 'error');
    }
}
```

#### OAuth Callback Handler
```javascript
function checkGoogleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('google_auth');
    const imported = urlParams.get('imported');
    
    if (authStatus === 'success') {
        const importedCount = parseInt(imported) || 0;
        if (importedCount > 0) {
            showToast(`Google Calendar connected! Imported ${importedCount} events as tasks.`, 'success');
            loadData(); // Reload tasks to show imported events
        } else {
            showToast('Google Calendar connected successfully!', 'success');
        }
        loadGoogleCalendarStatus();
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
        const message = urlParams.get('message') || 'Authentication failed';
        showToast(`Google Calendar: ${message}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}
```

#### Event Listeners
```javascript
// In setupEventListeners() function:
document.getElementById('connect-google-btn')?.addEventListener('click', connectGoogleCalendar);
document.getElementById('disconnect-google-btn')?.addEventListener('click', disconnectGoogleCalendar);
document.getElementById('sync-calendar-btn')?.addEventListener('click', syncGoogleCalendar);

// Load status when settings view is shown
const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        setTimeout(loadGoogleCalendarStatus, 100);
    });
}

// Check for OAuth callback on page load
// In init() function:
checkGoogleAuthCallback();
```

#### Update showView Function
```javascript
case 'settings':
    elements.settingsView.classList.remove('hidden');
    elements.currentViewTitle.textContent = 'Settings';
    loadLLMConfig();
    loadGoogleCalendarStatus(); // Add this line
    break;
```

### 4. CSS Styling (`static/css/style.css`)

Add styles:
```css
/* Google Calendar Settings */
.settings-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: 1rem;
}

.gcal-status {
    padding: 1rem;
    border-radius: var(--border-radius);
    background: var(--bg-tertiary);
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
}

.status-badge.success {
    background: var(--success-light);
    color: var(--success);
}

.status-badge.warning {
    background: var(--warning-light);
    color: #b36b00;
}

.status-badge.neutral {
    background: var(--bg-hover);
    color: var(--text-secondary);
}

.gcal-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
}

.btn-outline {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
}

.btn-outline.danger {
    border-color: var(--error);
    color: var(--error);
}

.btn-outline.danger:hover {
    background: var(--error-light);
}

.google-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: white;
    color: #4285f4;
    font-weight: 700;
    font-size: 0.75rem;
    border-radius: 2px;
    margin-right: 0.25rem;
}

.code-block {
    display: block;
    background: var(--bg-primary);
    padding: 0.75rem;
    border-radius: var(--border-radius);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    margin: 0.75rem 0;
    overflow-x: auto;
    white-space: pre;
    border: 1px solid var(--border-color);
}
```

## Google Cloud Console Setup

### Step 1: Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**:
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Client ID
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Choose **Web application**
4. Add **Authorized redirect URIs**:
   - `http://localhost:5000/api/calendar/callback` (for local dev)
   - `https://yourdomain.com/api/calendar/callback` (for production)
5. Copy **Client ID** and **Client Secret**

### Step 3: Configure OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Choose **External** (for testing) or **Internal** (for Google Workspace)
3. Fill in required fields:
   - App name: "NovaDo"
   - User support email
   - Developer contact email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (if External)

## Testing Checklist

### Backend Tests
- [ ] `/api/calendar/config` returns correct configuration status
- [ ] `/api/calendar/status` returns connection status for authenticated user
- [ ] `/api/calendar/auth` generates valid OAuth URL
- [ ] `/api/calendar/callback` handles OAuth response correctly
- [ ] `/api/calendar/callback` imports events as tasks
- [ ] `/api/calendar/callback` prevents duplicate imports
- [ ] `/api/calendar/disconnect` removes tokens from database
- [ ] `/api/calendar/sync` fetches new events since last sync
- [ ] Token refresh works when access token expires

### Frontend Tests
- [ ] Settings page shows correct status (not configured/not connected/connected)
- [ ] "Connect Google Calendar" button redirects to OAuth
- [ ] OAuth callback shows success message with import count
- [ ] Imported events appear in task list
- [ ] Imported events appear in calendar view
- [ ] "Sync Now" button fetches new events
- [ ] "Disconnect" button removes connection
- [ ] Status updates correctly after connect/disconnect

### Integration Tests
- [ ] Full OAuth flow works end-to-end
- [ ] Events are imported with correct dates/times
- [ ] All-day events are handled correctly
- [ ] Events with no title default to "Untitled"
- [ ] Duplicate events are not imported twice
- [ ] Calendar view displays imported events
- [ ] Tasks can be edited after import

## Error Handling

### Backend Errors
- Handle missing OAuth credentials gracefully
- Handle expired tokens with automatic refresh
- Handle API rate limits
- Handle invalid OAuth state
- Handle missing event data

### Frontend Errors
- Show user-friendly error messages
- Handle network errors
- Handle OAuth cancellation
- Handle missing configuration

## Security Considerations

1. **Token Storage**: Store tokens securely in database (encrypted in production)
2. **State Validation**: Always validate OAuth state parameter
3. **HTTPS**: Use HTTPS in production for OAuth redirects
4. **Token Refresh**: Automatically refresh expired tokens
5. **Scope Limitation**: Only request read-only calendar access
6. **User Isolation**: Ensure users can only access their own calendar

## Production Deployment Notes

1. Update `GOOGLE_REDIRECT_URI` to production URL
2. Add production redirect URI to Google Cloud Console
3. Use environment variables for all secrets
4. Enable HTTPS
5. Consider using Redis for OAuth state storage (instead of in-memory)
6. Add rate limiting for sync endpoint
7. Add logging for OAuth flows
8. Monitor API quota usage

## File Structure Summary

```
app/
├── routes/
│   └── calendar.py          # All calendar routes
├── database.py              # Database helper (already exists)
└── auth.py                  # Auth helper (already exists)

static/
├── js/
│   ├── api.js               # Add calendar API methods
│   └── app.js               # Add calendar UI functions
├── css/
│   └── style.css            # Add calendar styles
└── index.html               # Add calendar settings UI

main.py                      # Register calendar router
.env                        # Add Google OAuth credentials
requirements.txt            # Add Google API packages
```

## Implementation Order

1. **Backend Setup**
   - Install dependencies
   - Add environment variables
   - Create calendar.py route file
   - Implement helper functions
   - Implement all routes
   - Register router in main.py
   - Test endpoints with Postman/curl

2. **Frontend Setup**
   - Add API methods to api.js
   - Add HTML to index.html
   - Add CSS styles
   - Add JavaScript functions
   - Add event listeners
   - Test UI flow

3. **Integration**
   - Test full OAuth flow
   - Verify event import
   - Test sync functionality
   - Test disconnect
   - Verify calendar view display

4. **Polish**
   - Add error handling
   - Add loading states
   - Add success messages
   - Test edge cases

## Success Criteria

✅ User can connect Google Calendar with one click
✅ Events are automatically imported as tasks
✅ Imported events appear in calendar view
✅ User can sync new events manually
✅ User can disconnect Google Calendar
✅ No duplicate events are imported
✅ All-day events are handled correctly
✅ Error messages are user-friendly
✅ OAuth flow is secure and validated

---

**Note**: This implementation follows the Todoist-style approach: simple, automatic, and user-friendly. The user just clicks "Connect" and everything happens automatically.

