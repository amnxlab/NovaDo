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
                throw new Error(data.detail || data.message || 'Request failed');
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
            description: task.description || "",
            list: listId || null,  // Convert list_id to list, null if empty (backend will find Inbox)
            dueDate: task.due_date ? new Date(task.due_date) : null,  // Convert due_date to dueDate
            priority: this._convertPriorityToEnum(task.priority),  // Convert number to enum
            tags: task.tags || [],
            status: task.status || "scheduled"
        };
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
        if (task.due_date !== undefined) backendTask.dueDate = task.due_date ? new Date(task.due_date) : null;
        if (task.priority !== undefined) backendTask.priority = this._convertPriorityToEnum(task.priority);
        if (task.tags !== undefined) backendTask.tags = task.tags;
        // Handle status - support both old 'completed' boolean and new 'status' string
        if (task.status !== undefined) {
            backendTask.status = task.status;
        } else if (task.completed !== undefined) {
            backendTask.status = task.completed ? "completed" : "scheduled";
        }
        const data = await this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(backendTask)
        });
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

        const response = await fetch(`${this.baseUrl}/uploads/`, {
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

    // Pomodoro
    async savePomodoroSession(session) {
        return this.request('/pomodoro/', {
            method: 'POST',
            body: JSON.stringify(session)
        });
    }

    async getPomodoroSessions(date = null) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/pomodoro/${query}`);
    }

    // Statistics
    async getStats() {
        return this.request('/stats/');
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

    async selectCalendars(calendarIds) {
        return this.request('/calendar/calendars/select', {
            method: 'POST',
            body: JSON.stringify({ calendar_ids: calendarIds })
        });
    }
}

window.api = new API();
