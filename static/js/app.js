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
    searchInput: document.getElementById('search-input'),
    pomodoroView: document.getElementById('pomodoro-view'),
    statsView: document.getElementById('stats-view')
};

// Subtasks state for current task being edited
let currentSubtasks = [];
let currentAttachments = [];

// Pomodoro state
const pomodoroState = {
    isRunning: false,
    isPaused: false,
    isBreak: false,
    timeLeft: 25 * 60,
    sessionsCompleted: 0,
    totalFocusTime: 0,
    currentTaskId: null,
    interval: null,
    settings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLongBreak: 4
    }
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

    // Subtasks
    document.getElementById('add-subtask-btn').addEventListener('click', addSubtask);
    document.getElementById('new-subtask').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask();
        }
    });

    // Attachments
    document.getElementById('add-attachment-btn').addEventListener('click', () => {
        document.getElementById('attachment-input').click();
    });
    document.getElementById('attachment-input').addEventListener('change', handleAttachmentUpload);

    // Pomodoro
    document.getElementById('timer-start').addEventListener('click', startPomodoro);
    document.getElementById('timer-pause').addEventListener('click', pausePomodoro);
    document.getElementById('timer-reset').addEventListener('click', resetPomodoro);

    // Settings
    document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
    document.getElementById('ai-config-form').addEventListener('submit', handleAIConfigSubmit);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    
    // Notifications
    document.getElementById('enable-notifications-btn').addEventListener('click', enableNotifications);
    updateNotificationPermissionUI();
    
    // Menu toggle for mobile
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);

    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    // Search
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Smart input / AI chat
    document.getElementById('close-smart-modal').addEventListener('click', closeSmartModal);
    document.querySelector('#smart-input-modal .modal-overlay').addEventListener('click', closeSmartModal);
    document.getElementById('smart-form').addEventListener('submit', handleSmartInput);
    
    // AI floating button
    document.getElementById('ai-chat-btn').addEventListener('click', openAIChat);
    
    // Provider help text
    document.getElementById('llm-provider').addEventListener('change', updateProviderHelp);

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
    elements.pomodoroView.classList.add('hidden');
    elements.statsView.classList.add('hidden');

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
        case 'pomodoro':
            elements.pomodoroView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Pomodoro Timer';
            document.querySelector('[data-view="pomodoro"]')?.classList.add('active');
            initPomodoro();
            break;
        case 'stats':
            elements.statsView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Statistics';
            document.querySelector('[data-view="stats"]')?.classList.add('active');
            loadStats();
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
    
    // Add draggable support
    addDraggableToTasks();
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
    const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === id);
    if (taskIndex === -1) return;
    
    const task = state.tasks[taskIndex];
    const newCompleted = !task.completed;

    try {
        const updatedTask = await api.updateTask(id, { completed: newCompleted });
        // Update task in state with server response
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask, completed: newCompleted };
        renderTasks();
        updateCounts();
        showToast(newCompleted ? 'Task completed!' : 'Task uncompleted');
    } catch (error) {
        console.error('Toggle task error:', error);
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
    
    // Reset subtasks and attachments
    currentSubtasks = [];
    currentAttachments = [];

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
            
            // Load subtasks
            if (task.subtasks && task.subtasks.length > 0) {
                currentSubtasks = task.subtasks.map(s => ({
                    id: s.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: s.title,
                    completed: s.completed || false
                }));
            }
            
            // Load attachments
            if (task.attachments && task.attachments.length > 0) {
                currentAttachments = task.attachments.map(a => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    url: a.url,
                    preview: a.type && a.type.startsWith('image/') ? a.url : null
                }));
            }
        }
    } else {
        title.textContent = 'New Task';
        if (state.currentList) {
            document.getElementById('task-list').value = state.currentList;
        }
    }
    
    // Render subtasks and attachments
    renderSubtasks();
    renderAttachments();

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
        tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        subtasks: currentSubtasks.map(s => ({
            id: s.id,
            title: s.title,
            completed: s.completed
        }))
    };

    const dueDate = document.getElementById('task-due-date').value;
    if (dueDate) {
        taskData.due_date = new Date(dueDate).toISOString();
    }

    try {
        // Handle file uploads first if any new files
        const newFiles = currentAttachments.filter(a => a.file);
        if (newFiles.length > 0) {
            const uploadedAttachments = await uploadAttachments(newFiles);
            const existingAttachments = currentAttachments.filter(a => !a.file && a.url);
            taskData.attachments = [...existingAttachments, ...uploadedAttachments];
        } else {
            taskData.attachments = currentAttachments.filter(a => a.url).map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                url: a.url
            }));
        }
        
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

async function uploadAttachments(files) {
    const uploaded = [];
    for (const file of files) {
        try {
            const result = await api.uploadFile(file.file);
            uploaded.push({
                id: result.id,
                name: result.name,
                type: result.type,
                url: result.url
            });
        } catch (error) {
            console.error('Failed to upload:', file.name);
        }
    }
    return uploaded;
}

// Lists
function renderLists() {
    elements.customLists.innerHTML = '';

    state.lists.forEach(list => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.dataset.customList = list._id || list.id;
        li.dataset.listId = list._id || list.id;
        li.draggable = true;
        li.onclick = () => selectCustomList(list._id || list.id);

        const count = state.tasks.filter(t => t.list_id === (list._id || list.id) && !t.completed).length;

        li.innerHTML = `
            <span class="list-color" style="background: ${list.color || '#6366f1'}"></span>
            <span class="nav-label">${escapeHTML(list.name)}</span>
            <span class="nav-count">${count}</span>
        `;

        elements.customLists.appendChild(li);
    });
    
    // Initialize list drag and drop
    setTimeout(() => initListDragAndDrop(), 100);
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
        const dateStr = date.toISOString().split('T')[0];
        const isToday = date.getTime() === today.getTime();
        const dayTasks = state.tasks.filter(t => {
            if (!t.due_date) return false;
            const taskDate = new Date(t.due_date);
            return taskDate.getFullYear() === year && 
                   taskDate.getMonth() === month && 
                   taskDate.getDate() === day;
        });

        html += `
            <div class="calendar-day${isToday ? ' today' : ''}" data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${dayTasks.slice(0, 3).map(t => 
                    `<div class="calendar-task" data-task-id="${t._id || t.id}" draggable="true">${escapeHTML(t.title)}</div>`
                ).join('')}
                ${dayTasks.length > 3 ? `<div class="calendar-more">+${dayTasks.length - 3} more</div>` : ''}
            </div>
        `;
    }

    // Next month padding
    const remaining = 42 - startPadding - totalDays;
    for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        const dateStr = date.toISOString().split('T')[0];
        html += `<div class="calendar-day other-month" data-date="${dateStr}"><span class="day-number">${i}</span></div>`;
    }

    elements.calendarGrid.innerHTML = html;
    
    // Initialize calendar drag and drop
    setTimeout(() => initCalendarDragAndDrop(), 100);
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

// AI Chat
const conversationHistory = [];

function openAIChat() {
    if (!api.token) {
        showToast('Please log in to use AI assistant', 'error');
        return;
    }
    elements.smartModal.classList.remove('hidden');
    document.getElementById('smart-input').focus();
}

function closeSmartModal() {
    elements.smartModal.classList.add('hidden');
    // Reset to welcome message
    document.getElementById('smart-chat').innerHTML = `
        <div class="chat-message assistant">
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">
                Hi! I'm your AI assistant. I can help you create tasks using natural language. Try saying something like:
                <ul>
                    <li>"Remind me to call mom tomorrow at 3pm"</li>
                    <li>"Create an urgent task to review the report"</li>
                    <li>"Add a low priority task to water the plants weekly"</li>
                </ul>
            </div>
        </div>
    `;
    conversationHistory.length = 0;
}

async function handleSmartInput(e) {
    e.preventDefault();
    const input = document.getElementById('smart-input');
    const chat = document.getElementById('smart-chat');
    const message = input.value.trim();
    
    if (!message) return;

    // Add user message to chat
    chat.innerHTML += `
        <div class="chat-message user">
            <div class="chat-bubble">${escapeHTML(message)}</div>
            <div class="chat-avatar">👤</div>
        </div>
    `;
    input.value = '';
    input.disabled = true;
    
    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    chat.innerHTML += `
        <div class="chat-message assistant" id="${typingId}">
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble typing">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;

    try {
        // Add to conversation history
        conversationHistory.push({ role: 'user', content: message });
        
        // Call chat API
        const result = await api.chatLLM(message, conversationHistory);
        
        // Remove typing indicator
        document.getElementById(typingId)?.remove();
        
        // Add assistant response
        chat.innerHTML += `
            <div class="chat-message assistant">
                <div class="chat-avatar">🤖</div>
                <div class="chat-bubble">${formatAIResponse(result.message)}</div>
            </div>
        `;
        
        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: result.message });
        
        // If a task was parsed, create it
        if (result.task) {
            try {
                const created = await api.createTask(result.task);
                state.tasks.push(created);
                renderTasks();
                updateCounts();
                
                chat.innerHTML += `
                    <div class="chat-message assistant">
                        <div class="chat-avatar">✅</div>
                        <div class="chat-bubble success">Task created successfully!</div>
                    </div>
                `;
                showToast('Task created via AI', 'success');
            } catch (taskError) {
                chat.innerHTML += `
                    <div class="chat-message assistant">
                        <div class="chat-avatar">❌</div>
                        <div class="chat-bubble error">Failed to create task. Please try again.</div>
                    </div>
                `;
            }
        }
    } catch (error) {
        // Remove typing indicator
        document.getElementById(typingId)?.remove();
        
        const errorMessage = error.message.includes('not configured') 
            ? 'AI is not configured. Please go to Settings and add your API key.'
            : 'Sorry, I encountered an error. Please try again.';
        
        chat.innerHTML += `
            <div class="chat-message assistant">
                <div class="chat-avatar">🤖</div>
                <div class="chat-bubble error">${errorMessage}</div>
            </div>
        `;
    }
    
    input.disabled = false;
    input.focus();
    chat.scrollTop = chat.scrollHeight;
}

function formatAIResponse(text) {
    if (!text) return '';
    // Convert markdown-style formatting
    return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function updateProviderHelp() {
    const provider = document.getElementById('llm-provider').value;
    const helpEl = document.getElementById('provider-help');
    
    const helpText = {
        gemini: 'Get free API key at <a href="https://ai.google.dev" target="_blank">ai.google.dev</a>',
        groq: 'Get free API key at <a href="https://console.groq.com" target="_blank">console.groq.com</a>',
        openai: 'Get API key at <a href="https://platform.openai.com" target="_blank">platform.openai.com</a> (paid)'
    };
    
    helpEl.innerHTML = helpText[provider] || '';
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

// ============================================
// SUBTASKS FUNCTIONALITY
// ============================================

function addSubtask() {
    const input = document.getElementById('new-subtask');
    const title = input.value.trim();
    
    if (!title) return;
    
    currentSubtasks.push({
        id: Date.now().toString(),
        title: title,
        completed: false
    });
    
    input.value = '';
    renderSubtasks();
}

function renderSubtasks() {
    const list = document.getElementById('subtasks-list');
    const progress = document.getElementById('subtask-progress');
    
    if (currentSubtasks.length === 0) {
        list.innerHTML = '';
        progress.textContent = '';
        return;
    }
    
    const completed = currentSubtasks.filter(s => s.completed).length;
    progress.textContent = `${completed}/${currentSubtasks.length}`;
    
    list.innerHTML = currentSubtasks.map((subtask, index) => `
        <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-index="${index}">
            <div class="subtask-checkbox" onclick="toggleSubtask(${index})"></div>
            <span class="subtask-title">${escapeHTML(subtask.title)}</span>
            <button type="button" class="subtask-delete" onclick="deleteSubtask(${index})">×</button>
        </div>
    `).join('');
}

function toggleSubtask(index) {
    currentSubtasks[index].completed = !currentSubtasks[index].completed;
    renderSubtasks();
}

function deleteSubtask(index) {
    currentSubtasks.splice(index, 1);
    renderSubtasks();
}

// ============================================
// ATTACHMENTS FUNCTIONALITY
// ============================================

async function handleAttachmentUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    for (const file of files) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, 'error');
            continue;
        }
        
        // Create a preview object
        const attachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            size: file.size,
            file: file,
            preview: null
        };
        
        // Generate preview for images
        if (file.type.startsWith('image/')) {
            attachment.preview = await readFileAsDataURL(file);
        }
        
        currentAttachments.push(attachment);
    }
    
    renderAttachments();
    e.target.value = ''; // Reset file input
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderAttachments() {
    const list = document.getElementById('attachments-list');
    
    if (currentAttachments.length === 0) {
        list.innerHTML = '';
        return;
    }
    
    list.innerHTML = currentAttachments.map((att, index) => `
        <div class="attachment-item" data-index="${index}">
            ${att.preview ? `<img src="${att.preview}" alt="${escapeHTML(att.name)}">` : 
              `<span class="attachment-icon">📄</span>`}
            <span class="attachment-name" title="${escapeHTML(att.name)}">${escapeHTML(att.name)}</span>
            <button type="button" class="attachment-delete" onclick="deleteAttachment(${index})">×</button>
        </div>
    `).join('');
}

function deleteAttachment(index) {
    currentAttachments.splice(index, 1);
    renderAttachments();
}

// ============================================
// DRAG AND DROP FUNCTIONALITY
// ============================================

function initDragAndDrop() {
    const tasksList = document.getElementById('tasks-list');
    if (!tasksList) return;
    
    tasksList.addEventListener('dragstart', handleDragStart);
    tasksList.addEventListener('dragend', handleDragEnd);
    tasksList.addEventListener('dragover', handleDragOver);
    tasksList.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    if (!e.target.classList.contains('task-item')) return;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    
    document.getElementById('tasks-list').classList.add('drag-active');
}

function handleDragEnd(e) {
    if (!e.target.classList.contains('task-item')) return;
    
    e.target.classList.remove('dragging');
    document.getElementById('tasks-list').classList.remove('drag-active');
    
    document.querySelectorAll('.task-item.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const dragging = document.querySelector('.task-item.dragging');
    if (!dragging) return;
    
    const afterElement = getDragAfterElement(e.clientY);
    const tasksList = document.getElementById('tasks-list');
    
    // Remove previous drag-over indicators
    document.querySelectorAll('.task-item.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    if (afterElement) {
        afterElement.classList.add('drag-over');
    }
}

function getDragAfterElement(y) {
    const draggableElements = [...document.querySelectorAll('.task-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function handleDrop(e) {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    const dragging = document.querySelector('.task-item.dragging');
    if (!dragging) return;
    
    const afterElement = getDragAfterElement(e.clientY);
    const tasksList = document.getElementById('tasks-list');
    
    if (afterElement) {
        tasksList.insertBefore(dragging, afterElement);
    } else {
        tasksList.appendChild(dragging);
    }
    
    // Update order in state
    const newOrder = [...document.querySelectorAll('.task-item')].map(item => item.dataset.id);
    
    // Update positions in state
    newOrder.forEach((id, index) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            task.position = index;
        }
    });
    
    // Save order to backend (if endpoint exists)
    try {
        await api.updateTaskOrder(newOrder);
    } catch (error) {
        console.log('Order update not saved to server (endpoint may not exist)');
    }
}

// ============================================
// POMODORO TIMER FUNCTIONALITY
// ============================================

function initPomodoro() {
    loadPomodoroSettings();
    populatePomodoroTasks();
    updateTimerDisplay();
    loadTodayPomodoroStats();
}

function loadPomodoroSettings() {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
        Object.assign(pomodoroState.settings, JSON.parse(saved));
    }
    
    document.getElementById('pomo-work-duration').value = pomodoroState.settings.workDuration;
    document.getElementById('pomo-short-break').value = pomodoroState.settings.shortBreak;
    document.getElementById('pomo-long-break').value = pomodoroState.settings.longBreak;
    document.getElementById('pomo-sessions-count').value = pomodoroState.settings.sessionsBeforeLongBreak;
    
    // Listen for settings changes
    ['pomo-work-duration', 'pomo-short-break', 'pomo-long-break', 'pomo-sessions-count'].forEach(id => {
        document.getElementById(id).addEventListener('change', savePomodoroSettings);
    });
}

function savePomodoroSettings() {
    pomodoroState.settings.workDuration = parseInt(document.getElementById('pomo-work-duration').value) || 25;
    pomodoroState.settings.shortBreak = parseInt(document.getElementById('pomo-short-break').value) || 5;
    pomodoroState.settings.longBreak = parseInt(document.getElementById('pomo-long-break').value) || 15;
    pomodoroState.settings.sessionsBeforeLongBreak = parseInt(document.getElementById('pomo-sessions-count').value) || 4;
    
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroState.settings));
    
    if (!pomodoroState.isRunning) {
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
        updateTimerDisplay();
    }
}

function populatePomodoroTasks() {
    const select = document.getElementById('pomo-task-select');
    const incompleteTasks = state.tasks.filter(t => !t.completed);
    
    select.innerHTML = '<option value="">No task selected</option>' +
        incompleteTasks.map(task => 
            `<option value="${task.id}">${escapeHTML(task.title)}</option>`
        ).join('');
    
    select.addEventListener('change', (e) => {
        pomodoroState.currentTaskId = e.target.value || null;
    });
}

function startPomodoro() {
    if (pomodoroState.isPaused) {
        // Resume
        pomodoroState.isPaused = false;
    } else {
        // Fresh start
        pomodoroState.timeLeft = pomodoroState.isBreak 
            ? (pomodoroState.sessionsCompleted % pomodoroState.settings.sessionsBeforeLongBreak === 0 
                ? pomodoroState.settings.longBreak 
                : pomodoroState.settings.shortBreak) * 60
            : pomodoroState.settings.workDuration * 60;
    }
    
    pomodoroState.isRunning = true;
    
    document.getElementById('timer-start').disabled = true;
    document.getElementById('timer-pause').disabled = false;
    
    pomodoroState.interval = setInterval(updatePomodoro, 1000);
}

function pausePomodoro() {
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = true;
    
    clearInterval(pomodoroState.interval);
    
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-start').textContent = '▶ Resume';
    document.getElementById('timer-pause').disabled = true;
}

function resetPomodoro() {
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroState.isBreak = false;
    
    clearInterval(pomodoroState.interval);
    
    pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
    
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-start').textContent = '▶ Start';
    document.getElementById('timer-pause').disabled = true;
    document.getElementById('timer-label').textContent = 'Focus Time';
    document.getElementById('timer-label').classList.remove('break');
    
    updateTimerDisplay();
}

function updatePomodoro() {
    pomodoroState.timeLeft--;
    
    if (pomodoroState.timeLeft <= 0) {
        clearInterval(pomodoroState.interval);
        pomodoroState.isRunning = false;
        
        if (!pomodoroState.isBreak) {
            // Work session completed
            pomodoroState.sessionsCompleted++;
            pomodoroState.totalFocusTime += pomodoroState.settings.workDuration;
            
            // Save session
            savePomodoroSession();
            
            // Notify user
            playNotificationSound();
            if (Notification.permission === 'granted') {
                new Notification('Pomodoro Complete!', {
                    body: 'Time for a break!',
                    icon: '/favicon.ico'
                });
            }
            
            showToast('Focus session complete! Take a break.', 'success');
            
            // Switch to break
            pomodoroState.isBreak = true;
            const isLongBreak = pomodoroState.sessionsCompleted % pomodoroState.settings.sessionsBeforeLongBreak === 0;
            pomodoroState.timeLeft = (isLongBreak ? pomodoroState.settings.longBreak : pomodoroState.settings.shortBreak) * 60;
            
            document.getElementById('timer-label').textContent = isLongBreak ? 'Long Break' : 'Short Break';
            document.getElementById('timer-label').classList.add('break');
        } else {
            // Break completed
            playNotificationSound();
            if (Notification.permission === 'granted') {
                new Notification('Break Over!', {
                    body: 'Ready to focus again?',
                    icon: '/favicon.ico'
                });
            }
            
            showToast('Break over! Ready to focus?', 'success');
            
            // Switch back to work
            pomodoroState.isBreak = false;
            pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
            
            document.getElementById('timer-label').textContent = 'Focus Time';
            document.getElementById('timer-label').classList.remove('break');
        }
        
        document.getElementById('timer-start').disabled = false;
        document.getElementById('timer-start').textContent = '▶ Start';
        document.getElementById('timer-pause').disabled = true;
    }
    
    updateTimerDisplay();
    updatePomodoroStats();
}

function updateTimerDisplay() {
    const minutes = Math.floor(pomodoroState.timeLeft / 60);
    const seconds = pomodoroState.timeLeft % 60;
    document.getElementById('timer-display').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updatePomodoroStats() {
    document.getElementById('pomo-sessions').textContent = pomodoroState.sessionsCompleted;
    document.getElementById('pomo-total-time').textContent = `${pomodoroState.totalFocusTime}m`;
}

async function savePomodoroSession() {
    try {
        await api.savePomodoroSession({
            taskId: pomodoroState.currentTaskId,
            duration: pomodoroState.settings.workDuration,
            completedAt: new Date().toISOString()
        });
    } catch (error) {
        console.log('Pomodoro session saved locally only');
    }
    
    // Save to localStorage as backup
    const today = new Date().toISOString().split('T')[0];
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    if (!sessions[today]) sessions[today] = [];
    sessions[today].push({
        taskId: pomodoroState.currentTaskId,
        duration: pomodoroState.settings.workDuration,
        completedAt: new Date().toISOString()
    });
    localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
}

function loadTodayPomodoroStats() {
    const today = new Date().toISOString().split('T')[0];
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    const todaySessions = sessions[today] || [];
    
    pomodoroState.sessionsCompleted = todaySessions.length;
    pomodoroState.totalFocusTime = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    
    updatePomodoroStats();
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1idHx8fHx8fHx8fHx8fHx8fHx8fHx8fH19fX19fX19fX19fX19fX19fX19fX19fX19');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {}
}

// ============================================
// STATISTICS FUNCTIONALITY
// ============================================

async function loadStats() {
    try {
        // Try to get stats from API
        const stats = await api.getStats();
        renderStats(stats);
    } catch (error) {
        // Fall back to local calculation
        calculateLocalStats();
    }
}

function calculateLocalStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    // Completed today
    const completedToday = state.tasks.filter(t => {
        if (!t.completed || !t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
    }).length;
    
    // Completed this week
    const completedWeek = state.tasks.filter(t => {
        if (!t.completed || !t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= weekStart;
    }).length;
    
    // Calculate streak (days in a row with completed tasks)
    const streak = calculateStreak();
    
    // Pomodoro sessions
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    const todaySessions = sessions[today.toISOString().split('T')[0]] || [];
    
    renderStats({
        completedToday,
        completedWeek,
        streak,
        pomodoros: todaySessions.length,
        weeklyData: calculateWeeklyData()
    });
}

function calculateStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    while (true) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const completedOnDay = state.tasks.some(t => {
            if (!t.completed || !t.completed_at) return false;
            const completedDate = new Date(t.completed_at);
            return completedDate >= dayStart && completedDate < dayEnd;
        });
        
        if (completedOnDay) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
        
        // Safety limit
        if (streak > 365) break;
    }
    
    return streak;
}

function calculateWeeklyData() {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = state.tasks.filter(t => {
            if (!t.completed || !t.completed_at) return false;
            const completedDate = new Date(t.completed_at);
            return completedDate >= date && completedDate < nextDay;
        }).length;
        
        data.push({
            day: date.toLocaleDateString('en', { weekday: 'short' }),
            count
        });
    }
    
    return data;
}

function renderStats(stats) {
    document.getElementById('stat-completed-today').textContent = stats.completedToday || 0;
    document.getElementById('stat-completed-week').textContent = stats.completedWeek || 0;
    document.getElementById('stat-streak').textContent = stats.streak || 0;
    document.getElementById('stat-pomodoros').textContent = stats.pomodoros || 0;
    
    // Render weekly chart
    const weeklyData = stats.weeklyData || calculateWeeklyData();
    renderWeeklyChart(weeklyData);
    
    // Update productivity score
    const maxPossible = 10; // Target tasks per day
    const productivity = Math.min(100, Math.round((stats.completedToday / maxPossible) * 100));
    updateProductivityRing(productivity);
}

function renderWeeklyChart(data) {
    const barsContainer = document.querySelector('.chart-bars');
    const labelsContainer = document.querySelector('.chart-labels');
    
    if (!barsContainer || !labelsContainer) return;
    
    const maxValue = Math.max(...data.map(d => d.count), 1);
    
    barsContainer.innerHTML = data.map(d => {
        const height = Math.max(4, (d.count / maxValue) * 150);
        return `<div class="chart-bar" style="height: ${height}px" data-value="${d.count}"></div>`;
    }).join('');
    
    labelsContainer.innerHTML = data.map(d => 
        `<span class="chart-label">${d.day}</span>`
    ).join('');
}

function updateProductivityRing(percentage) {
    const ring = document.getElementById('productivity-ring');
    const scoreEl = document.getElementById('productivity-score');
    
    if (!ring || !scoreEl) return;
    
    const circumference = 2 * Math.PI * 45; // r = 45
    const offset = circumference - (percentage / 100) * circumference;
    
    ring.style.strokeDashoffset = offset;
    scoreEl.textContent = `${percentage}%`;
}

// Initialize drag and drop when tasks are rendered
const originalRenderTasks = typeof renderTasks === 'function' ? renderTasks : null;

// Extend renderTasks to add draggable attribute
function addDraggableToTasks() {
    document.querySelectorAll('.task-item').forEach(item => {
        item.draggable = true;
    });
    initDragAndDrop();
}

// ============================================
// CALENDAR DRAG AND DROP
// ============================================

function initCalendarDragAndDrop() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    const calendarTasks = document.querySelectorAll('.calendar-task');
    
    // Make calendar tasks draggable
    calendarTasks.forEach(task => {
        task.draggable = true;
        task.addEventListener('dragstart', handleCalendarTaskDragStart);
        task.addEventListener('dragend', handleCalendarTaskDragEnd);
    });
    
    // Make calendar days droppable
    calendarDays.forEach(day => {
        day.addEventListener('dragover', handleCalendarDayDragOver);
        day.addEventListener('drop', handleCalendarDayDrop);
        day.addEventListener('dragleave', handleCalendarDayDragLeave);
    });
}

function handleCalendarTaskDragStart(e) {
    e.stopPropagation();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleCalendarTaskDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.calendar-day.drag-over').forEach(day => {
        day.classList.remove('drag-over');
    });
}

function handleCalendarDayDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleCalendarDayDragLeave(e) {
    if (e.currentTarget === e.target) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleCalendarDayDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newDate = e.currentTarget.dataset.date;
    
    if (!taskId || !newDate) return;
    
    try {
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (!task) return;
        
        // Update task due date
        await api.updateTask(taskId, { due_date: new Date(newDate).toISOString() });
        
        // Update local state
        task.due_date = new Date(newDate).toISOString();
        
        // Re-render calendar
        renderCalendar();
        showToast('Task moved successfully', 'success');
    } catch (error) {
        console.error('Failed to move task:', error);
        showToast('Failed to move task', 'error');
    }
}

// ============================================
// LIST DRAG AND DROP (REORDERING SIDEBAR)
// ============================================

function initListDragAndDrop() {
    const listItems = document.querySelectorAll('.nav-item[data-list-id]');
    
    listItems.forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', handleListDragStart);
        item.addEventListener('dragend', handleListDragEnd);
        item.addEventListener('dragover', handleListDragOver);
        item.addEventListener('drop', handleListDrop);
    });
}

function handleListDragStart(e) {
    e.stopPropagation();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.listId);
}

function handleListDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.nav-item.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleListDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const dragging = document.querySelector('.nav-item.dragging');
    if (!dragging || e.currentTarget === dragging) return;
    
    e.currentTarget.classList.add('drag-over');
}

async function handleListDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const targetId = e.currentTarget.dataset.listId;
    
    if (!draggedId || !targetId || draggedId === targetId) return;
    
    // Reorder lists in state
    const draggedIndex = state.lists.findIndex(l => (l._id || l.id) === draggedId);
    const targetIndex = state.lists.findIndex(l => (l._id || l.id) === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Move dragged item to target position
    const [draggedList] = state.lists.splice(draggedIndex, 1);
    state.lists.splice(targetIndex, 0, draggedList);
    
    // Re-render lists
    renderLists();
    showToast('List reordered', 'success');
}

// ============================================
// NOTIFICATIONS FUNCTIONALITY
// ============================================

async function enableNotifications() {
    if (!('Notification' in window)) {
        showToast('Notifications not supported in this browser', 'error');
        return;
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
        showToast('Notifications enabled!', 'success');
        
        // Try to subscribe to push notifications
        if (window.notificationManager) {
            await window.notificationManager.subscribe();
        }
        
        // Show a test notification
        if (window.notificationManager) {
            window.notificationManager.showLocalNotification('TaskFlow', {
                body: 'Notifications are now enabled!',
                tag: 'test-notification'
            });
        }
    } else if (permission === 'denied') {
        showToast('Notification permission denied', 'error');
    }
    
    updateNotificationPermissionUI();
}

function updateNotificationPermissionUI() {
    const stateEl = document.getElementById('notification-permission-state');
    const btn = document.getElementById('enable-notifications-btn');
    
    if (!stateEl || !btn) return;
    
    if (!('Notification' in window)) {
        stateEl.textContent = 'Not Supported';
        btn.disabled = true;
        btn.textContent = 'Not Available';
        return;
    }
    
    const permission = Notification.permission;
    stateEl.textContent = permission.charAt(0).toUpperCase() + permission.slice(1);
    
    switch (permission) {
        case 'granted':
            stateEl.style.color = 'var(--success)';
            btn.textContent = 'Enabled';
            btn.disabled = true;
            break;
        case 'denied':
            stateEl.style.color = 'var(--error)';
            btn.textContent = 'Blocked by Browser';
            btn.disabled = true;
            break;
        default:
            stateEl.style.color = 'var(--warning)';
            btn.textContent = 'Enable Notifications';
            btn.disabled = false;
    }
}

// Schedule reminders for tasks with due dates
function scheduleTaskReminders() {
    if (!window.notificationManager || Notification.permission !== 'granted') return;
    
    const now = new Date();
    
    state.tasks.forEach(task => {
        if (task.completed || !task.due_date) return;
        
        const dueDate = new Date(task.due_date);
        const timeDiff = dueDate.getTime() - now.getTime();
        
        // Only schedule for tasks due in the next 24 hours
        if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
            window.notificationManager.scheduleReminder(
                task.title,
                task.due_date,
                task.id || task._id
            );
        }
    });
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
    
    // Close sidebar when clicking outside
    if (sidebar.classList.contains('open')) {
        const closeOnClickOutside = (e) => {
            if (!sidebar.contains(e.target) && !e.target.closest('.menu-toggle')) {
                sidebar.classList.remove('open');
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 100);
    }
}

// Call this after tasks are loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize notification manager
    if (window.notificationManager && window.notificationManager.isSupported) {
        window.notificationManager.init();
    }
});
