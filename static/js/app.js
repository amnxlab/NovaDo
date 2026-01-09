/**
 * TaskFlow Application
 */

// Reference to window.api (created in api.js, loaded before this script)
const api = window.api;

// State
const state = {
    user: null,
    tasks: [],
    lists: [],
    habits: [],
    currentView: 'inbox',
    currentList: null,
    calendarDate: new Date()
};

// DOM Elements
const elements = {
    authScreen: document.getElementById('auth-screen'),
    mainScreen: document.getElementById('main-screen'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginError: document.getElementById('login-error'),
    registerError: document.getElementById('register-error'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    userName: document.querySelector('.user-name'),
    currentViewTitle: document.getElementById('current-view-title'),
    tasksList: document.getElementById('tasks-list'),
    emptyState: document.getElementById('empty-state'),
    customLists: document.getElementById('custom-lists'),
    smartLists: document.getElementById('smart-lists'),
    habitsView: document.getElementById('habits-view'),
    habitsList: document.getElementById('habits-list'),
    calendarView: document.getElementById('calendar-view'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarMonth: document.getElementById('calendar-month'),
    settingsView: document.getElementById('settings-view'),
    tasksView: document.getElementById('tasks-view'),
    taskModal: document.getElementById('task-modal'),
    listModal: document.getElementById('list-modal'),
    habitModal: document.getElementById('habit-modal'),
    smartModal: document.getElementById('smart-input-modal'),
    searchInput: document.getElementById('search-input')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        setupEventListeners();
        await checkAuth();
    } catch (error) {
        console.error('Init error:', error);
        if (typeof showToast === 'function') {
            showToast('Application initialization failed', 'error');
        }
    }
}

function setupEventListeners() {
    // Auth tabs
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            elements.loginForm.classList.toggle('hidden', tab !== 'login');
            elements.registerForm.classList.toggle('hidden', tab !== 'register');
        });
    });

    // Auth forms
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);

    // Navigation
    document.querySelectorAll('.nav-item[data-list]').forEach(item => {
        item.addEventListener('click', () => selectSmartList(item.dataset.list));
    });

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => showView(item.dataset.view));
    });

    // Buttons
    document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
    document.getElementById('add-list-btn').addEventListener('click', () => openListModal());
    document.getElementById('add-habit-btn').addEventListener('click', () => openHabitModal());
    document.getElementById('settings-btn').addEventListener('click', () => showView('settings'));
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Task modal
    document.getElementById('close-task-modal').addEventListener('click', closeTaskModal);
    document.getElementById('cancel-task').addEventListener('click', closeTaskModal);
    document.querySelector('#task-modal .modal-overlay').addEventListener('click', closeTaskModal);
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // List modal
    document.getElementById('close-list-modal').addEventListener('click', closeListModal);
    document.getElementById('cancel-list').addEventListener('click', closeListModal);
    document.querySelector('#list-modal .modal-overlay').addEventListener('click', closeListModal);
    document.getElementById('list-form').addEventListener('submit', handleListSubmit);

    // Habit modal
    document.getElementById('close-habit-modal').addEventListener('click', closeHabitModal);
    document.getElementById('cancel-habit').addEventListener('click', closeHabitModal);
    document.querySelector('#habit-modal .modal-overlay').addEventListener('click', closeHabitModal);
    document.getElementById('habit-form').addEventListener('submit', handleHabitSubmit);

    // Settings
    document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
    document.getElementById('ai-config-form').addEventListener('submit', handleAIConfigSubmit);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    // Search
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Smart input
    document.getElementById('close-smart-modal').addEventListener('click', closeSmartModal);
    document.querySelector('#smart-input-modal .modal-overlay').addEventListener('click', closeSmartModal);
    document.getElementById('smart-form').addEventListener('submit', handleSmartInput);

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

// Auth
async function checkAuth() {
    if (!api.token) {
        showAuthScreen();
        return;
    }

    try {
        const meResponse = await api.getMe();
        state.user = meResponse;
        showMainScreen();
        await loadData();
    } catch (error) {
        api.logout();
        showAuthScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        elements.loginError.textContent = '';
        const loginResponse = await api.login(email, password);
        // Use user from login response directly
        state.user = loginResponse.user || loginResponse;
        showMainScreen();
        await loadData();
    } catch (error) {
        elements.loginError.textContent = error.message;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        elements.registerError.textContent = '';
        const registerResponse = await api.register(name, email, password);
        // Use user from register response directly
        state.user = registerResponse.user || registerResponse;
        showMainScreen();
        await loadData();
    } catch (error) {
        elements.registerError.textContent = error.message;
    }
}

function handleLogout() {
    api.logout();
    state.user = null;
    state.tasks = [];
    state.lists = [];
    state.habits = [];
    showAuthScreen();
}

// Screens
function showAuthScreen() {
    elements.authScreen.classList.remove('hidden');
    elements.mainScreen.classList.add('hidden');
}

function showMainScreen() {
    elements.authScreen.classList.add('hidden');
    elements.mainScreen.classList.remove('hidden');
    elements.userName.textContent = state.user?.name || 'User';
    document.getElementById('settings-name').value = state.user?.name || '';
    document.getElementById('settings-email').value = state.user?.email || '';
}

// Data Loading
async function loadData() {
    try {
        const [tasks, lists, habits] = await Promise.all([
            api.getTasks(),
            api.getLists(),
            api.getHabits()
        ]);

        state.tasks = tasks;
        state.lists = lists;
        state.habits = habits;

        renderLists();
        renderTasks();
        updateCounts();
    } catch (error) {
        showToast('Failed to load data', 'error');
    }
}

// Views
function showView(view) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    elements.tasksView.classList.add('hidden');
    elements.habitsView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.settingsView.classList.add('hidden');

    state.currentView = view;

    switch (view) {
        case 'habits':
            elements.habitsView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Habits';
            document.querySelector('[data-view="habits"]')?.classList.add('active');
            renderHabits();
            break;
        case 'calendar':
            elements.calendarView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Calendar';
            document.querySelector('[data-view="calendar"]')?.classList.add('active');
            renderCalendar();
            break;
        case 'settings':
            elements.settingsView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Settings';
            loadLLMConfig();
            break;
        default:
            elements.tasksView.classList.remove('hidden');
            selectSmartList(view);
    }
}

function selectSmartList(listId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-list="${listId}"]`)?.classList.add('active');

    state.currentView = listId;
    state.currentList = null;

    const titles = {
        inbox: 'Inbox',
        today: 'Today',
        week: 'Next 7 Days',
        all: 'All Tasks',
        completed: 'Completed'
    };

    elements.currentViewTitle.textContent = titles[listId] || listId;
    
    elements.tasksView.classList.remove('hidden');
    elements.habitsView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.settingsView.classList.add('hidden');
    
    renderTasks();
}

function selectCustomList(listId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-custom-list="${listId}"]`)?.classList.add('active');

    state.currentView = 'custom';
    state.currentList = listId;

    const list = state.lists.find(l => l._id === listId || l.id === listId);
    elements.currentViewTitle.textContent = list?.name || 'List';
    
    elements.tasksView.classList.remove('hidden');
    elements.habitsView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.settingsView.classList.add('hidden');
    
    renderTasks();
}

// Tasks
function renderTasks() {
    let tasks = [...state.tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Filter based on current view
    switch (state.currentView) {
        case 'inbox':
            tasks = tasks.filter(t => !t.completed && !t.list_id);
            break;
        case 'today':
            tasks = tasks.filter(t => {
                if (t.completed) return false;
                if (!t.due_date) return false;
                const due = new Date(t.due_date);
                due.setHours(0, 0, 0, 0);
                return due.getTime() === today.getTime();
            });
            break;
        case 'week':
            tasks = tasks.filter(t => {
                if (t.completed) return false;
                if (!t.due_date) return false;
                const due = new Date(t.due_date);
                return due >= today && due < weekEnd;
            });
            break;
        case 'all':
            tasks = tasks.filter(t => !t.completed);
            break;
        case 'completed':
            tasks = tasks.filter(t => t.completed);
            break;
        case 'custom':
            tasks = tasks.filter(t => t.list_id === state.currentList);
            break;
    }

    // Apply search filter
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (searchTerm) {
        tasks = tasks.filter(t => 
            t.title.toLowerCase().includes(searchTerm) ||
            (t.description && t.description.toLowerCase().includes(searchTerm))
        );
    }

    // Sort by priority and due date
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
    });

    elements.tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    tasks.forEach(task => {
        const el = createTaskElement(task);
        elements.tasksList.appendChild(el);
    });
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item${task.completed ? ' completed' : ''}`;
    div.dataset.id = task._id || task.id;

    const dueDateHTML = task.due_date ? formatDueDate(task.due_date) : '';
    const priorityHTML = task.priority ? `<span class="task-priority" data-priority="${task.priority}"></span>` : '';
    const tagsHTML = (task.tags || []).map(tag => `<span class="task-tag">${tag}</span>`).join('');

    div.innerHTML = `
        <div class="task-checkbox" onclick="toggleTask('${task._id || task.id}', event)"></div>
        <div class="task-content" onclick="openTaskModal('${task._id || task.id}')">
            <div class="task-title">${escapeHTML(task.title)}</div>
            <div class="task-meta">
                ${dueDateHTML}
                ${priorityHTML}
                <div class="task-tags">${tagsHTML}</div>
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-icon" onclick="deleteTask('${task._id || task.id}', event)" title="Delete">🗑️</button>
        </div>
    `;

    return div;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    let className = 'task-due';
    let label = '';

    if (dateOnly < today) {
        className += ' overdue';
        label = 'Overdue';
    } else if (dateOnly.getTime() === today.getTime()) {
        className += ' today';
        label = 'Today';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
        label = 'Tomorrow';
    } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    return `<span class="${className}">📅 ${label} ${time !== '12:00 AM' ? time : ''}</span>`;
}

async function toggleTask(id, e) {
    e.stopPropagation();
    const task = state.tasks.find(t => (t._id || t.id) === id);
    if (!task) return;

    try {
        await api.updateTask(id, { completed: !task.completed });
        task.completed = !task.completed;
        renderTasks();
        updateCounts();
        showToast(task.completed ? 'Task completed!' : 'Task uncompleted');
    } catch (error) {
        showToast('Failed to update task', 'error');
    }
}

async function deleteTask(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;

    try {
        await api.deleteTask(id);
        state.tasks = state.tasks.filter(t => (t._id || t.id) !== id);
        renderTasks();
        updateCounts();
        showToast('Task deleted');
    } catch (error) {
        showToast('Failed to delete task', 'error');
    }
}

function openTaskModal(taskId = null) {
    const modal = elements.taskModal;
    const form = document.getElementById('task-form');
    const title = document.getElementById('task-modal-title');
    
    form.reset();
    document.getElementById('task-id').value = '';

    // Populate list select
    const listSelect = document.getElementById('task-list');
    listSelect.innerHTML = '<option value="">Inbox</option>';
    state.lists.forEach(list => {
        listSelect.innerHTML += `<option value="${list._id || list.id}">${escapeHTML(list.name)}</option>`;
    });

    if (taskId) {
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (task) {
            title.textContent = 'Edit Task';
            document.getElementById('task-id').value = taskId;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority || 0;
            document.getElementById('task-list').value = task.list_id || '';
            document.getElementById('task-tags').value = (task.tags || []).join(', ');
            if (task.due_date) {
                const date = new Date(task.due_date);
                document.getElementById('task-due-date').value = date.toISOString().slice(0, 16);
            }
        }
    } else {
        title.textContent = 'New Task';
        if (state.currentList) {
            document.getElementById('task-list').value = state.currentList;
        }
    }

    modal.classList.remove('hidden');
    document.getElementById('task-title').focus();
}

function closeTaskModal() {
    elements.taskModal.classList.add('hidden');
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    let listId = document.getElementById('task-list').value || null;
    
    // If no list selected, find the user's Inbox list
    if (!listId) {
        const inboxList = state.lists.find(l => l.name === 'Inbox' || (l.isDefault && !l.isSmart));
        if (inboxList) {
            listId = inboxList._id || inboxList.id;
        }
    }
    
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        priority: parseInt(document.getElementById('task-priority').value),
        list_id: listId,
        tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean)
    };

    const dueDate = document.getElementById('task-due-date').value;
    if (dueDate) {
        taskData.due_date = new Date(dueDate).toISOString();
    }

    try {
        if (taskId) {
            const updated = await api.updateTask(taskId, taskData);
            const idx = state.tasks.findIndex(t => (t._id || t.id) === taskId);
            if (idx !== -1) state.tasks[idx] = { ...state.tasks[idx], ...updated };
            showToast('Task updated');
        } else {
            const created = await api.createTask(taskData);
            state.tasks.push(created);
            showToast('Task created');
        }

        closeTaskModal();
        renderTasks();
        updateCounts();
    } catch (error) {
        showToast('Failed to save task', 'error');
    }
}

// Lists
function renderLists() {
    elements.customLists.innerHTML = '';

    state.lists.forEach(list => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.dataset.customList = list._id || list.id;
        li.onclick = () => selectCustomList(list._id || list.id);

        const count = state.tasks.filter(t => t.list_id === (list._id || list.id) && !t.completed).length;

        li.innerHTML = `
            <span class="list-color" style="background: ${list.color || '#6366f1'}"></span>
            <span class="nav-label">${escapeHTML(list.name)}</span>
            <span class="nav-count">${count}</span>
        `;

        elements.customLists.appendChild(li);
    });
}

function openListModal() {
    elements.listModal.classList.remove('hidden');
    document.getElementById('list-name').focus();
}

function closeListModal() {
    elements.listModal.classList.add('hidden');
    document.getElementById('list-form').reset();
}

async function handleListSubmit(e) {
    e.preventDefault();
    
    const listData = {
        name: document.getElementById('list-name').value,
        color: document.getElementById('list-color').value
    };

    try {
        const created = await api.createList(listData);
        state.lists.push(created);
        closeListModal();
        renderLists();
        showToast('List created');
    } catch (error) {
        showToast('Failed to create list', 'error');
    }
}

// Habits
function renderHabits() {
    elements.habitsList.innerHTML = '';

    if (state.habits.length === 0) {
        elements.habitsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No habits yet</h3>
                <p>Create habits to track your daily routines</p>
            </div>
        `;
        return;
    }

    state.habits.forEach(habit => {
        const card = createHabitCard(habit);
        elements.habitsList.appendChild(card);
    });
}

function createHabitCard(habit) {
    const div = document.createElement('div');
    div.className = 'habit-card';

    const today = new Date();
    const completedToday = (habit.completed_dates || []).some(d => 
        isSameDay(new Date(d), today)
    );

    // Create week view
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
        const isCompleted = (habit.completed_dates || []).some(d => isSameDay(new Date(d), date));
        const isToday = i === 0;
        weekDays.push({ date, dayName, isCompleted, isToday });
    }

    const streak = calculateStreak(habit);

    div.innerHTML = `
        <div class="habit-header">
            <span class="habit-name">${escapeHTML(habit.name)}</span>
            <span class="habit-streak">🔥 ${streak}</span>
        </div>
        <div class="habit-week">
            ${weekDays.map(d => `
                <div class="habit-day${d.isCompleted ? ' completed' : ''}${d.isToday ? ' today' : ''}"
                     onclick="toggleHabit('${habit._id || habit.id}', '${d.date.toISOString()}')"
                     title="${d.date.toLocaleDateString()}">
                    ${d.dayName}
                </div>
            `).join('')}
        </div>
        <div class="habit-actions">
            <button class="btn-icon" onclick="deleteHabit('${habit._id || habit.id}')" title="Delete">🗑️</button>
        </div>
    `;

    return div;
}

function calculateStreak(habit) {
    const dates = (habit.completed_dates || []).map(d => new Date(d)).sort((a, b) => b - a);
    if (dates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        expected.setHours(0, 0, 0, 0);

        const actual = new Date(dates[i]);
        actual.setHours(0, 0, 0, 0);

        if (actual.getTime() === expected.getTime()) {
            streak++;
        } else if (i === 0 && actual < expected) {
            // Allow today to not be completed yet
            const yesterday = new Date(expected);
            yesterday.setDate(yesterday.getDate() - 1);
            if (actual.getTime() === yesterday.getTime()) {
                streak++;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return streak;
}

async function toggleHabit(id, dateStr) {
    const habit = state.habits.find(h => (h._id || h.id) === id);
    if (!habit) return;

    const date = new Date(dateStr);
    const isCompleted = (habit.completed_dates || []).some(d => isSameDay(new Date(d), date));

    try {
        if (isCompleted) {
            await api.uncompleteHabit(id, dateStr);
            habit.completed_dates = (habit.completed_dates || []).filter(d => !isSameDay(new Date(d), date));
        } else {
            await api.completeHabit(id, dateStr);
            habit.completed_dates = [...(habit.completed_dates || []), dateStr];
        }
        renderHabits();
    } catch (error) {
        showToast('Failed to update habit', 'error');
    }
}

async function deleteHabit(id) {
    if (!confirm('Delete this habit?')) return;

    try {
        await api.deleteHabit(id);
        state.habits = state.habits.filter(h => (h._id || h.id) !== id);
        renderHabits();
        showToast('Habit deleted');
    } catch (error) {
        showToast('Failed to delete habit', 'error');
    }
}

function openHabitModal() {
    elements.habitModal.classList.remove('hidden');
    document.getElementById('habit-name').focus();
}

function closeHabitModal() {
    elements.habitModal.classList.add('hidden');
    document.getElementById('habit-form').reset();
}

async function handleHabitSubmit(e) {
    e.preventDefault();

    const habitData = {
        name: document.getElementById('habit-name').value,
        frequency: document.getElementById('habit-frequency').value,
        target: parseInt(document.getElementById('habit-target').value)
    };

    try {
        const created = await api.createHabit(habitData);
        state.habits.push(created);
        closeHabitModal();
        renderHabits();
        showToast('Habit created');
    } catch (error) {
        showToast('Failed to create habit', 'error');
    }
}

// Calendar
function renderCalendar() {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();

    elements.calendarMonth.textContent = state.calendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
    }

    // Current month
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const isToday = date.getTime() === today.getTime();
        const dayTasks = state.tasks.filter(t => {
            if (!t.due_date) return false;
            const taskDate = new Date(t.due_date);
            return taskDate.getFullYear() === year && 
                   taskDate.getMonth() === month && 
                   taskDate.getDate() === day;
        });

        html += `
            <div class="calendar-day${isToday ? ' today' : ''}">
                <span class="day-number">${day}</span>
                ${dayTasks.slice(0, 3).map(t => 
                    `<div class="calendar-task">${escapeHTML(t.title)}</div>`
                ).join('')}
                ${dayTasks.length > 3 ? `<div class="calendar-task">+${dayTasks.length - 3} more</div>` : ''}
            </div>
        `;
    }

    // Next month padding
    const remaining = 42 - startPadding - totalDays;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month"><span class="day-number">${i}</span></div>`;
    }

    elements.calendarGrid.innerHTML = html;
}

function changeMonth(delta) {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
    renderCalendar();
}

// Settings
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    try {
        const updated = await api.updateProfile({
            name: document.getElementById('settings-name').value
        });
        state.user = { ...state.user, ...updated };
        elements.userName.textContent = state.user.name;
        showToast('Profile updated');
    } catch (error) {
        showToast('Failed to update profile', 'error');
    }
}

async function loadLLMConfig() {
    try {
        const config = await api.getLLMConfig();
        document.getElementById('ai-status').textContent = 
            config.configured ? '✓ AI configured' : 'Not configured';
        document.getElementById('ai-status').className = 
            'status-text' + (config.configured ? ' success' : '');
    } catch (error) {
        // Ignore
    }
}

async function handleAIConfigSubmit(e) {
    e.preventDefault();

    try {
        await api.setLLMConfig({
            provider: document.getElementById('llm-provider').value,
            api_key: document.getElementById('llm-api-key').value
        });
        document.getElementById('llm-api-key').value = '';
        document.getElementById('ai-status').textContent = '✓ AI configured';
        document.getElementById('ai-status').className = 'status-text success';
        showToast('AI configured successfully');
    } catch (error) {
        showToast('Failed to configure AI', 'error');
    }
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Smart Input
function closeSmartModal() {
    elements.smartModal.classList.add('hidden');
    document.getElementById('smart-chat').innerHTML = '';
}

async function handleSmartInput(e) {
    e.preventDefault();
    const input = document.getElementById('smart-input');
    const chat = document.getElementById('smart-chat');
    const message = input.value.trim();
    
    if (!message) return;

    chat.innerHTML += `<div class="chat-message user">${escapeHTML(message)}</div>`;
    input.value = '';

    try {
        const result = await api.parseLLM(message);
        
        if (result.task) {
            chat.innerHTML += `<div class="chat-message assistant">
                Got it! Creating task: "${escapeHTML(result.task.title)}"
                ${result.task.due_date ? `<br>Due: ${new Date(result.task.due_date).toLocaleString()}` : ''}
            </div>`;
            
            const created = await api.createTask(result.task);
            state.tasks.push(created);
            renderTasks();
            updateCounts();
            showToast('Task created via AI');
            
            setTimeout(closeSmartModal, 1500);
        } else if (result.message) {
            chat.innerHTML += `<div class="chat-message assistant">${escapeHTML(result.message)}</div>`;
        }
    } catch (error) {
        chat.innerHTML += `<div class="chat-message assistant">Sorry, I couldn't process that. Make sure AI is configured in Settings.</div>`;
    }

    chat.scrollTop = chat.scrollHeight;
}

// Utilities
function updateCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const incomplete = state.tasks.filter(t => !t.completed);

    document.getElementById('inbox-count').textContent = incomplete.filter(t => !t.list_id).length;
    document.getElementById('today-count').textContent = incomplete.filter(t => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
    }).length;
    document.getElementById('week-count').textContent = incomplete.filter(t => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        return due >= today && due < weekEnd;
    }).length;
    document.getElementById('all-count').textContent = incomplete.length;
    document.getElementById('completed-count').textContent = state.tasks.filter(t => t.completed).length;
}

function handleSearch() {
    renderTasks();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✓', error: '✗', warning: '⚠' };
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.success}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
