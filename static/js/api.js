/**
 * NovaDo API Client
 */

const API_URL = window.location.origin + '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[API] Error response:', response.status, data);
                const errorMessage = data.detail || data.message || 'Request failed';
                throw new Error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async register(name, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        if (data.access_token) {
            this.setToken(data.access_token);
        } else if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.access_token) {
            this.setToken(data.access_token);
        } else if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getMe() {
        const data = await this.request('/auth/me');
        // Return user object directly for consistency
        return data.user || data;
    }

    async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    logout() {
        this.setToken(null);
    }

    // Tasks
    async getTasks(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await this.request(`/tasks/${query ? '?' + query : ''}`);
        // Backend returns {"tasks": [...]}, extract and normalize the array
        const tasks = data.tasks || data;
        if (Array.isArray(tasks)) {
            return tasks.map(task => this._normalizeTask(task));
        }
        return tasks;
    }

    async getTask(id) {
        const data = await this.request(`/tasks/${id}`);
        // Backend returns {"task": {...}}, extract and normalize
        const taskObj = data.task || data;
        return this._normalizeTask(taskObj);
    }

    async createTask(task) {
        // Convert frontend field names to backend field names
        const listId = task.list_id || task.list;
        const backendTask = {
            title: task.title,
            description: task.description || ""
            // Note: status is NOT sent - backend sets it to "scheduled" automatically
        };

        // Only include list if it's a valid non-empty string
        if (listId && typeof listId === 'string' && listId.trim() !== '') {
            backendTask.list = listId;
        }

        // Only include dueDate if provided
        if (task.due_date) {
            backendTask.dueDate = task.due_date;  // Send as string YYYY-MM-DD
        }

        // Only include dueTime if provided
        if (task.due_time) {
            backendTask.dueTime = task.due_time;  // Send as string HH:MM
        }

        // Only include priority if provided, convert to enum
        if (task.priority !== undefined && task.priority !== null) {
            backendTask.priority = this._convertPriorityToEnum(task.priority);
        }

        // Only include tags if provided and non-empty
        if (task.tags && Array.isArray(task.tags) && task.tags.length > 0) {
            backendTask.tags = task.tags;
        }

        // Only include subtasks if provided
        if (task.subtasks && Array.isArray(task.subtasks)) {
            backendTask.subtasks = task.subtasks;
        }

        // Only include attachments if provided
        if (task.attachments && Array.isArray(task.attachments)) {
            backendTask.attachments = task.attachments;
        }

        // Include reminder if provided
        if (task.reminder) {
            backendTask.reminder = task.reminder;
        }

        // Include syncToCalendar if provided
        if (task.syncToCalendar !== undefined) {
            backendTask.syncToCalendar = task.syncToCalendar;
        }

        console.log('[API] Creating task with payload:', backendTask);

        const data = await this.request('/tasks/', {
            method: 'POST',
            body: JSON.stringify(backendTask)
        });
        // Backend returns {"task": {...}}, extract and normalize
        const taskObj = data.task || data;
        return this._normalizeTask(taskObj);
    }

    async updateTask(id, task) {
        // Convert frontend field names to backend field names
        const backendTask = {};
        if (task.title !== undefined) backendTask.title = task.title;
        if (task.description !== undefined) backendTask.description = task.description;
        if (task.list_id !== undefined) backendTask.list = task.list_id;  // Convert list_id to list
        if (task.due_date !== undefined) backendTask.dueDate = task.due_date || null;  // Send as string
        if (task.due_time !== undefined) backendTask.dueTime = task.due_time || null;  // Send as string
        if (task.priority !== undefined) backendTask.priority = this._convertPriorityToEnum(task.priority);
        if (task.tags !== undefined) backendTask.tags = task.tags;
        if (task.subtasks !== undefined) backendTask.subtasks = task.subtasks;
        if (task.attachments !== undefined) backendTask.attachments = task.attachments;
        if (task.reminder !== undefined) backendTask.reminder = task.reminder;
        if (task.syncToCalendar !== undefined) backendTask.syncToCalendar = task.syncToCalendar;
        // Handle status - support both old 'completed' boolean and new 'status' string
        if (task.status !== undefined) {
            backendTask.status = task.status;
            console.log('[API] Setting task status to:', task.status);
        } else if (task.completed !== undefined) {
            backendTask.status = task.completed ? "completed" : "scheduled";
        }

        // Also pass through dueDate directly if provided
        if (task.dueDate !== undefined) {
            backendTask.dueDate = task.dueDate;
        }

        console.log('[API] updateTask - id:', id, 'payload:', backendTask);

        const data = await this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(backendTask)
        });

        console.log('[API] updateTask response:', data);

        // Backend returns {"task": {...}}, extract and normalize
        const taskObj = data.task || data;
        return this._normalizeTask(taskObj);
    }

    _convertPriorityToEnum(priority) {
        // Frontend uses numbers (0=none, 1=low, 2=medium, 3=high)
        // Backend expects enum strings
        const priorityMap = { 0: "none", 1: "low", 2: "medium", 3: "high" };
        if (typeof priority === "number") {
            return priorityMap[priority] || "none";
        }
        return priority || "none";
    }

    _normalizeTask(task) {
        // Convert backend format to frontend format
        if (!task) return task;
        const normalized = { ...task };
        // Convert list object to list_id string
        if (normalized.list) {
            if (typeof normalized.list === 'object' && normalized.list._id) {
                normalized.list_id = normalized.list._id;
            } else if (typeof normalized.list === 'object' && normalized.list.id) {
                normalized.list_id = normalized.list.id;
            } else if (normalized.list) {
                normalized.list_id = String(normalized.list);
            }
        } else {
            normalized.list_id = null;
        }
        // Convert dueDate to due_date
        if (normalized.dueDate) {
            normalized.due_date = normalized.dueDate;
        }
        // Convert dueTime to due_time
        if (normalized.dueTime) {
            normalized.due_time = normalized.dueTime;
        }
        // Normalize status - keep the status field, also set completed for backward compatibility
        if (!normalized.status) {
            normalized.status = 'scheduled';
        }
        // Handle legacy 'active' status -> 'scheduled'
        if (normalized.status === 'active') {
            normalized.status = 'scheduled';
        }
        normalized.completed = normalized.status === "completed";
        // Convert priority enum to number
        if (normalized.priority) {
            if (typeof normalized.priority === "string") {
                const priorityMap = { "none": 0, "low": 1, "medium": 2, "high": 3 };
                normalized.priority = priorityMap[normalized.priority] || 0;
            }
        } else {
            normalized.priority = 0;
        }
        return normalized;
    }

    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    // Lists
    async getLists() {
        const data = await this.request('/lists/');
        // Backend returns {"lists": [...]}, extract the array
        return data.lists || data;
    }

    async createList(list) {
        const data = await this.request('/lists/', {
            method: 'POST',
            body: JSON.stringify(list)
        });
        // Backend returns {"list": {...}}, extract the list object
        return data.list || data;
    }

    async updateList(id, list) {
        return this.request(`/lists/${id}`, {
            method: 'PUT',
            body: JSON.stringify(list)
        });
    }

    async deleteList(id) {
        return this.request(`/lists/${id}`, {
            method: 'DELETE'
        });
    }

    // Tags (Hierarchical tag system)
    async getTags() {
        const data = await this.request('/tags/');
        // Backend returns {"tags": [...]}, extract the array
        return data.tags || data;
    }

    async createTag(tag) {
        const data = await this.request('/tags/', {
            method: 'POST',
            body: JSON.stringify(tag)
        });
        // Backend returns {"tag": {...}}, extract the tag object
        return data.tag || data;
    }

    async updateTag(id, tag) {
        const data = await this.request(`/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tag)
        });
        return data.tag || data;
    }

    async deleteTag(id) {
        return this.request(`/tags/${id}`, {
            method: 'DELETE'
        });
    }

    // Habits
    async getHabits() {
        const data = await this.request('/habits/');
        // Backend returns {"habits": [...]}, extract the array
        return data.habits || data;
    }

    async createHabit(habit) {
        const data = await this.request('/habits/', {
            method: 'POST',
            body: JSON.stringify(habit)
        });
        // Backend returns {"habit": {...}}, extract the habit object
        return data.habit || data;
    }

    async updateHabit(id, habit) {
        return this.request(`/habits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(habit)
        });
    }

    async deleteHabit(id) {
        return this.request(`/habits/${id}`, {
            method: 'DELETE'
        });
    }

    async completeHabit(id, date) {
        return this.request(`/habits/${id}/complete`, {
            method: 'POST',
            body: JSON.stringify({ date })
        });
    }

    async uncompleteHabit(id, date) {
        return this.request(`/habits/${id}/uncomplete`, {
            method: 'POST',
            body: JSON.stringify({ date })
        });
    }

    // LLM
    async getLLMConfig() {
        return this.request('/llm/config');
    }

    async setLLMConfig(config) {
        return this.request('/llm/config', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    async parseLLM(input) {
        return this.request('/llm/parse', {
            method: 'POST',
            body: JSON.stringify({ input })
        });
    }

    async chatLLM(message, conversationHistory = []) {
        return this.request('/llm/chat', {
            method: 'POST',
            body: JSON.stringify({ message, conversationHistory })
        });
    }

    async getLLMProviders() {
        return this.request('/llm/providers');
    }

    // File uploads
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/uploads/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    }

    // Task ordering
    async updateTaskOrder(taskIds) {
        return this.request('/tasks/reorder', {
            method: 'POST',
            body: JSON.stringify({ taskIds })
        });
    }

    // Focus / Pomodoro
    async saveFocusSession(session) {
        return this.request('/focus/sessions', {
            method: 'POST',
            body: JSON.stringify(session)
        });
    }

    async getFocusSessions(limit = 50) {
        return this.request(`/focus/sessions?limit=${limit}`);
    }

    async getFocusStats() {
        return this.request('/focus/stats');
    }

    async deleteFocusSession(id) {
        return this.request(`/focus/sessions/${id}`, {
            method: 'DELETE'
        });
    }

    // Deprecated Pomodoro methods (kept for backward compatibility if any)
    async savePomodoroSession(session) {
        // Convert old format to new
        return this.saveFocusSession({
            duration: session.duration,
            type: 'pomo',
            startTime: new Date(Date.now() - session.duration * 60000).toISOString(),
            endTime: new Date().toISOString()
        });
    }

    // Statistics
    async getStats() {
        return this.request('/stats/');
    }

    async getMonthlyStats() {
        return this.request('/stats/monthly');
    }

    async getInsights() {
        return this.request('/stats/insights');
    }

    async getGamificationStats() {
        return this.request('/stats/gamification');
    }

    // Google Calendar
    async getCalendarConfig() {
        return this.request(`/calendar/config?t=${Date.now()}`);
    }

    async getCalendarStatus() {
        return this.request(`/calendar/status?t=${Date.now()}`);
    }

    async startGoogleAuth() {
        return this.request(`/calendar/auth?t=${Date.now()}`);
    }

    async disconnectGoogle() {
        return this.request('/calendar/disconnect', {
            method: 'POST'
        });
    }

    async listCalendars() {
        return this.request(`/calendar/calendars?t=${Date.now()}`);
    }

    async getCalendarEvents(calendarId = 'primary', daysBack = 30, daysForward = 90) {
        return this.request(`/calendar/events?calendar_id=${calendarId}&days_back=${daysBack}&days_forward=${daysForward}&t=${Date.now()}`);
    }

    async importCalendar(importAs, calendarId = 'primary', daysBack = 30, daysForward = 90) {
        return this.request('/calendar/import', {
            method: 'POST',
            body: JSON.stringify({
                import_as: importAs,
                calendar_id: calendarId,
                days_back: daysBack,
                days_forward: daysForward
            })
        });
    }

    async syncCalendar() {
        return this.request('/calendar/sync', {
            method: 'POST'
        });
    }

    async bidirectionalSync() {
        return this.request('/calendar/sync/bidirectional', {
            method: 'POST'
        });
    }

    async selectCalendars(calendarIds) {
        return this.request('/calendar/calendars/select', {
            method: 'POST',
            body: JSON.stringify({ calendar_ids: calendarIds })
        });
    }

    // User Preferences
    async getPreferences() {
        return this.request('/user/preferences');
    }

    async updatePreferences(preferences) {
        return this.request('/user/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
    }
}

window.api = new API();
