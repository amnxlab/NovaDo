/**
 * TaskFlow API Client
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
        }
        return data;
    }

    async getMe() {
        return this.request('/auth/me');
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
        return this.request(`/tasks${query ? '?' + query : ''}`);
    }

    async getTask(id) {
        return this.request(`/tasks/${id}`);
    }

    async createTask(task) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(task)
        });
    }

    async updateTask(id, task) {
        return this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(task)
        });
    }

    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    // Lists
    async getLists() {
        return this.request('/lists');
    }

    async createList(list) {
        return this.request('/lists', {
            method: 'POST',
            body: JSON.stringify(list)
        });
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
        return this.request('/habits');
    }

    async createHabit(habit) {
        return this.request('/habits', {
            method: 'POST',
            body: JSON.stringify(habit)
        });
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

    async chatLLM(message, conversationId) {
        return this.request('/llm/chat', {
            method: 'POST',
            body: JSON.stringify({ message, conversation_id: conversationId })
        });
    }
}

window.api = new API();

