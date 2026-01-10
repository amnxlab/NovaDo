/**
 * NovaDo Application
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
    calendarDate: new Date(),
    calendarViewMode: 'month' // 'day', 'week', 'month', 'agenda'
};

// Sidebar configuration
const defaultSmartLists = [
    { id: 'inbox', icon: '📥', label: 'Inbox', countId: 'inbox-count' },
    { id: 'today', icon: '📅', label: 'Today', countId: 'today-count' },
    { id: 'week', icon: '📆', label: 'Next 7 Days', countId: 'week-count' },
    { id: 'all', icon: '📋', label: 'All Tasks', countId: 'all-count' },
    { id: 'completed', icon: '✅', label: 'Completed', countId: 'completed-count' }
];

const defaultTools = [
    { id: 'habits', icon: '🎯', label: 'Habits', view: 'habits' },
    { id: 'calendar', icon: '📆', label: 'Calendar', view: 'calendar' },
    { id: 'pomodoro', icon: '🍅', label: 'Pomodoro', view: 'pomodoro' },
    { id: 'stats', icon: '📊', label: 'Statistics', view: 'stats' }
];

// Get sidebar config from localStorage or use defaults
function getSidebarConfig() {
    const saved = localStorage.getItem('sidebarConfig');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        smartLists: defaultSmartLists.map(l => ({ ...l, visible: true, customLabel: null })),
        tools: defaultTools.map(t => ({ ...t, visible: true, customLabel: null }))
    };
}

function saveSidebarConfig(config) {
    localStorage.setItem('sidebarConfig', JSON.stringify(config));
}

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
    calendarDayView: document.getElementById('calendar-day-view'),
    calendarWeekView: document.getElementById('calendar-week-view'),
    calendarAgendaView: document.getElementById('calendar-agenda-view'),
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
    mode: 'pomo', // 'pomo' or 'stopwatch'
    isRunning: false,
    isPaused: false, // For stopwatch or paused pomo
    isBreak: false,
    timeLeft: 25 * 60, // For Pomo
    elapsedTime: 0, // For Stopwatch
    sessionsCompleted: 0,
    totalFocusTime: 0,
    currentTaskId: null,
    interval: null,
    startTime: null, // For tracking when session started
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
        checkGoogleAuthCallback(); // Check for Google OAuth callback
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

    // Navigation - Note: Smart lists and tools are rendered dynamically
    // Static nav items (if any) can be handled here
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => showView(item.dataset.view));
    });

    // Buttons
    document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
    document.getElementById('add-list-btn').addEventListener('click', () => openListModal());
    document.getElementById('add-habit-btn').addEventListener('click', () => openHabitModal());
    document.getElementById('settings-btn').addEventListener('click', () => showView('settings'));
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Quick add task input
    const quickTaskInput = document.getElementById('quick-task-input');
    if (quickTaskInput) {
        quickTaskInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const title = e.target.value.trim();
                e.target.value = '';
                try {
                    const listId = state.currentList && !['inbox', 'today', 'week', 'all', 'completed'].includes(state.currentList)
                        ? state.currentList : null;
                    await api.createTask({ title, list: listId });
                    await loadTasks();
                    showNotification('Task added', 'success');
                } catch (error) {
                    showNotification('Failed to add task', 'error');
                }
            }
        });
    }

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
    const timerStartBtn = document.getElementById('timer-start');
    if (timerStartBtn) timerStartBtn.addEventListener('click', startPomodoro);

    const timerExitBtn = document.getElementById('timer-exit');
    if (timerExitBtn) timerExitBtn.addEventListener('click', exitPomodoro);

    // Pomodoro tabs
    document.querySelectorAll('.pomo-tab').forEach(tab => {
        tab.addEventListener('click', (e) => switchPomoMode(e.target.dataset.mode));
    });

    // Pomodoro settings toggle
    const pomoSettingsBtn = document.getElementById('pomo-settings-btn');
    if (pomoSettingsBtn) {
        pomoSettingsBtn.addEventListener('click', () => {
            const panel = document.getElementById('pomo-settings-panel');
            if (panel) panel.classList.toggle('hidden');
        });
    }

    // Settings
    document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
    document.getElementById('ai-config-form').addEventListener('submit', handleAIConfigSubmit);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Google Calendar
    document.getElementById('connect-google-btn')?.addEventListener('click', connectGoogleCalendar);
    document.getElementById('disconnect-google-btn')?.addEventListener('click', disconnectGoogleCalendar);
    document.getElementById('sync-calendar-btn')?.addEventListener('click', syncGoogleCalendar);

    // Load Google Calendar status when settings view is shown
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            setTimeout(loadGoogleCalendarStatus, 100);
        });
    }

    // Notifications
    document.getElementById('enable-notifications-btn').addEventListener('click', enableNotifications);
    updateNotificationPermissionUI();

    // Menu toggle for mobile
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);

    // Calendar navigation
    document.getElementById('prev-period').addEventListener('click', () => changeCalendarPeriod(-1));
    document.getElementById('next-period').addEventListener('click', () => changeCalendarPeriod(1));
    document.getElementById('today-btn').addEventListener('click', () => goToToday());

    // Calendar view mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            setCalendarViewMode(mode);
        });
    });

    // Sidebar item management
    document.querySelectorAll('.section-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddSidebarModal(btn.dataset.section);
        });
    });

    // Add sidebar modal
    const closeSidebarModalBtn = document.getElementById('close-sidebar-modal');
    if (closeSidebarModalBtn) {
        closeSidebarModalBtn.addEventListener('click', closeAddSidebarModal);
    }
    const addSidebarOverlay = document.querySelector('#add-sidebar-modal .modal-overlay');
    if (addSidebarOverlay) {
        addSidebarOverlay.addEventListener('click', closeAddSidebarModal);
    }

    // Rename modal
    const closeRenameModalBtn = document.getElementById('close-rename-modal');
    if (closeRenameModalBtn) {
        closeRenameModalBtn.addEventListener('click', closeRenameModal);
    }
    const cancelRenameBtn = document.getElementById('cancel-rename');
    if (cancelRenameBtn) {
        cancelRenameBtn.addEventListener('click', closeRenameModal);
    }
    const renameForm = document.getElementById('rename-form');
    if (renameForm) {
        renameForm.addEventListener('submit', handleRenameSubmit);
    }
    const renameOverlay = document.querySelector('#rename-modal .modal-overlay');
    if (renameOverlay) {
        renameOverlay.addEventListener('click', closeRenameModal);
    }

    // Context menu actions
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const menu = document.getElementById('context-menu');
            const action = e.currentTarget.dataset.action;
            const itemType = menu.dataset.itemType;
            const itemId = menu.dataset.itemId;

            menu.classList.add('hidden');

            if (action === 'rename') {
                openRenameModal(itemType, itemId);
            } else if (action === 'delete') {
                if (itemType === 'custom-list') {
                    deleteList(itemId);
                } else {
                    removeSidebarItem(itemType, itemId);
                }
            }
        });
    });

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
        // Render sidebar first (from local config)
        renderSmartLists();
        renderTools();

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

// Calendar View
function renderCalendar() {
    console.log("[DEBUG] Render Calendar. Total Tasks:", state.tasks.length);
    console.log("[DEBUG] Sample Task:", state.tasks[0]);
    const calendarGrid = document.getElementById('calendar-grid');
    const prevBtn = document.getElementById('prev-period');
    const nextBtn = document.getElementById('next-period');
    const todayBtn = document.getElementById('today-btn');
    const monthLabel = document.getElementById('calendar-month');

    if (!calendarGrid) return;

    if (!state.calendarDate) {
        state.calendarDate = new Date();
    }

    const currentYear = state.calendarDate.getFullYear();
    const currentMonth = state.calendarDate.getMonth();

    // Set month label
    monthLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(state.calendarDate);

    // Render Grid
    calendarGrid.innerHTML = '';

    // Day Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header-cell';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Calculate days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay(); // 0-6
    const totalDays = lastDay.getDate();

    // Previous month filler
    for (let i = 0; i < startingDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day prev-month';
        calendarGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const dateNum = document.createElement('div');
        dateNum.className = 'calendar-date-num';
        dateNum.textContent = day;
        cell.appendChild(dateNum);

        const dateStr = new Date(currentYear, currentMonth, day).toDateString();
        // Highlight today
        if (dateStr === new Date().toDateString()) {
            cell.classList.add('today');
        }

        // Find tasks for this day
        // Tasks have dueDate string (ISO)
        const targetDate = new Date(currentYear, currentMonth, day);
        targetDate.setHours(0, 0, 0, 0);

        const dayTasks = state.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            // Log date comparison for first few tasks
            // console.log("Comp:", taskDate.toDateString(), targetDate.toDateString());
            return taskDate.toDateString() === targetDate.toDateString();
        });

        // Limit display to 3 tasks
        const displayTasks = dayTasks.slice(0, 3);

        displayTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'calendar-task-item';
            taskEl.textContent = task.title;
            taskEl.title = task.title;

            // Check for Google Calendar color
            if (task.googleCalendarColor) {
                taskEl.style.backgroundColor = task.googleCalendarColor;
                taskEl.style.color = '#fff';
                taskEl.style.borderLeft = 'none';
            } else {
                // Priority colors
                if (task.priority === '3') taskEl.classList.add('priority-high');
                else if (task.priority === '2') taskEl.classList.add('priority-medium');
                else if (task.priority === '1') taskEl.classList.add('priority-low');
                else taskEl.classList.add('task-default');
            }

            // Make task clickable
            taskEl.onclick = (e) => {
                e.stopPropagation();
                openTaskModal(task._id);
            };

            // Add drag attributes
            taskEl.draggable = true;
            taskEl.dataset.taskId = task._id;
            taskEl.ondragstart = (e) => {
                if (typeof handleCalendarTaskDragStart === 'function') handleCalendarTaskDragStart(e);
            };

            cell.appendChild(taskEl);
        });

        if (dayTasks.length > 3) {
            const more = document.createElement('div');
            more.className = 'calendar-more';
            more.textContent = `+${dayTasks.length - 3} more`;
            more.onclick = (e) => {
                e.stopPropagation();
                openDayAgenda(new Date(currentYear, currentMonth, day), dayTasks);
            };
            cell.appendChild(more);
        }

        // Click on cell background opens day agenda
        cell.onclick = (e) => {
            if (e.target === cell || e.target.classList.contains('day-number')) {
                openDayAgenda(new Date(currentYear, currentMonth, day), dayTasks);
            }
        };

        // Add drop listeners for drag and drop
        cell.dataset.date = new Date(currentYear, currentMonth, day).toISOString();
        if (typeof handleCalendarDayDrop === 'function') {
            cell.ondragover = handleCalendarDayDragOver;
            cell.ondragleave = handleCalendarDayDragLeave;
            cell.ondrop = handleCalendarDayDrop;
        }

        calendarGrid.appendChild(cell);
    }

    // Navigation Events (re-bind safely)
    prevBtn.onclick = () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
        renderCalendar();
    };
    nextBtn.onclick = () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
        renderCalendar();
    };
    todayBtn.onclick = () => {
        state.calendarDate = new Date();
        renderCalendar();
    };
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
            loadGoogleCalendarStatus(); // Load Google Calendar status
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
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                return due.getTime() === today.getTime();
            });
            break;
        case 'week':
            tasks = tasks.filter(t => {
                if (t.completed) return false;
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
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
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
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
    const status = task.status || 'scheduled';
    div.className = `task-item status-${status}${task.completed ? ' completed' : ''}`;
    div.dataset.id = task._id || task.id;
    div.dataset.status = status;

    const dueDateHTML = task.due_date ? formatDueDate(task.due_date) : '';
    const priorityHTML = task.priority ? `<span class="task-priority" data-priority="${task.priority}"></span>` : '';
    const tagsHTML = (task.tags || []).map(tag => `<span class="task-tag">${tag}</span>`).join('');

    // Status badge
    const statusConfig = {
        'scheduled': { icon: '📅', label: 'Scheduled', class: 'scheduled' },
        'in_progress': { icon: '▶️', label: 'In Progress', class: 'in-progress' },
        'completed': { icon: '✓', label: 'Completed', class: 'completed' }
    };
    const statusInfo = statusConfig[status] || statusConfig['scheduled'];
    const statusBadgeHTML = `<span class="task-status-badge ${statusInfo.class}" title="${statusInfo.label}">${statusInfo.icon}</span>`;

    div.innerHTML = `
        <div class="task-checkbox ${status === 'completed' ? 'checked' : ''}" onclick="completeTask('${task._id || task.id}', event)" title="Mark as completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <div class="task-content" onclick="openTaskModal('${task._id || task.id}')">
            <div class="task-header">
                <div class="task-title">${escapeHTML(task.title)}</div>
                ${statusBadgeHTML}
            </div>
            <div class="task-meta">
                ${dueDateHTML}
                ${priorityHTML}
                <div class="task-tags">${tagsHTML}</div>
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-icon status-btn" onclick="cycleTaskStatus('${task._id || task.id}', event)" title="Change status">
                ${status === 'scheduled' ? '▶️' : status === 'in_progress' ? '⏸️' : '↩️'}
            </button>
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
    await cycleTaskStatus(id, e);
}

// Complete task directly (checkmark click)
async function completeTask(id, e) {
    e.stopPropagation();
    const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === id);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    const newStatus = task.status === 'completed' ? 'scheduled' : 'completed';

    try {
        const updatedTask = await api.updateTask(id, { status: newStatus });
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };
        renderTasks();
        renderCalendar();
        updateCounts();
        showToast(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
    } catch (error) {
        console.error('Complete task error:', error);
        showToast('Failed to update task', 'error');
    }
}

// Cycle through status: scheduled -> in_progress -> completed -> scheduled
async function cycleTaskStatus(id, e) {
    e.stopPropagation();
    const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === id);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    const statusCycle = ['scheduled', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(task.status || 'scheduled');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    const statusLabels = {
        'scheduled': 'Scheduled',
        'in_progress': 'In Progress',
        'completed': 'Completed'
    };

    try {
        const updatedTask = await api.updateTask(id, { status: nextStatus });
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };
        renderTasks();
        renderCalendar();
        updateCounts();
        showToast(`Task: ${statusLabels[nextStatus]}`);
    } catch (error) {
        console.error('Cycle task status error:', error);
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

/**
 * Open a modal showing all tasks for a specific day (Day Agenda View)
 */
function openDayAgenda(date, tasks) {
    // Remove existing modal if present
    let modal = document.getElementById('day-agenda-modal');
    if (modal) modal.remove();

    // Create modal
    modal = document.createElement('div');
    modal.id = 'day-agenda-modal';
    modal.className = 'modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Sort tasks by time
    const sortedTasks = [...tasks].sort((a, b) => {
        const timeA = a.dueTime || '23:59';
        const timeB = b.dueTime || '23:59';
        return timeA.localeCompare(timeB);
    });

    modal.innerHTML = `
        <div class="day-agenda-content">
            <div class="day-agenda-header">
                <h2>${dateStr}</h2>
                <span class="task-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="day-agenda-list">
                ${sortedTasks.length === 0 ? '<p class="no-tasks">No tasks for this day</p>' : ''}
                ${sortedTasks.map(task => {
        const time = task.dueTime || 'All day';
        const priorityClass = task.priority === 'high' ? 'priority-high' :
            task.priority === 'medium' ? 'priority-medium' :
                task.priority === 'low' ? 'priority-low' : '';
        const isGoogle = task.googleEventId ? true : false;
        const bgColor = task.googleCalendarColor || '';

        return `
                        <div class="day-agenda-item ${priorityClass}" 
                             data-task-id="${task._id}"
                             style="${bgColor ? `border-left: 4px solid ${bgColor};` : ''}"
                             onclick="document.getElementById('day-agenda-modal').remove(); openTaskModal('${task._id}');">
                            <div class="agenda-time">${time}</div>
                            <div class="agenda-details">
                                <div class="agenda-title">${task.title}</div>
                                ${task.description ? `<div class="agenda-desc">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                                <div class="agenda-tags">
                                    ${isGoogle ? '<span class="tag google-tag">📅 Google</span>' : ''}
                                    ${(task.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                                </div>
                            </div>
                            <div class="agenda-status ${task.status === 'completed' ? 'completed' : ''}">${task.status === 'completed' ? '✓' : '○'}</div>
                        </div>
                    `;
    }).join('')}
            </div>
            <div class="day-agenda-footer">
                <button class="btn btn-primary" onclick="document.getElementById('day-agenda-modal').remove(); state.taskDefaultDate = '${date.toISOString().split('T')[0]}'; openTaskModal();">
                    + Add Task
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add escape key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
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
            document.getElementById('task-status').value = task.status || 'scheduled';
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
        document.getElementById('task-status').value = 'scheduled';
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
        status: document.getElementById('task-status').value,
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

// ============================================
// SIDEBAR ITEM MANAGEMENT
// ============================================

function renderSmartLists() {
    const config = getSidebarConfig();
    const smartListsEl = document.getElementById('smart-lists');
    if (!smartListsEl) return;

    smartListsEl.innerHTML = '';

    config.smartLists.filter(item => item.visible).forEach(item => {
        const li = document.createElement('li');
        li.className = `nav-item${state.currentList === item.id ? ' active' : ''}`;
        li.dataset.list = item.id;
        li.dataset.itemType = 'smart-list';

        li.innerHTML = `
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${escapeHTML(item.customLabel || item.label)}</span>
            <span class="nav-count" id="${item.countId}">0</span>
            <div class="item-actions">
                <button class="item-action-btn delete" title="Remove" onclick="event.stopPropagation(); removeSidebarItem('smart-list', '${item.id}')">×</button>
            </div>
        `;

        li.onclick = (e) => {
            if (!e.target.closest('.item-actions')) {
                selectSmartList(item.id);
            }
        };

        li.oncontextmenu = (e) => showContextMenu(e, 'smart-list', item.id);

        smartListsEl.appendChild(li);
    });
}

function renderTools() {
    const config = getSidebarConfig();
    const toolsListEl = document.getElementById('tools-list');
    if (!toolsListEl) return;

    toolsListEl.innerHTML = '';

    config.tools.filter(item => item.visible).forEach(item => {
        const li = document.createElement('li');
        li.className = `nav-item${state.currentView === item.view ? ' active' : ''}`;
        li.dataset.view = item.view;
        li.dataset.itemType = 'tool';

        li.innerHTML = `
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${escapeHTML(item.customLabel || item.label)}</span>
            <div class="item-actions">
                <button class="item-action-btn delete" title="Remove" onclick="event.stopPropagation(); removeSidebarItem('tool', '${item.id}')">×</button>
            </div>
        `;

        li.onclick = (e) => {
            if (!e.target.closest('.item-actions')) {
                showView(item.view);
            }
        };

        li.oncontextmenu = (e) => showContextMenu(e, 'tool', item.id);

        toolsListEl.appendChild(li);
    });
}

function showContextMenu(e, itemType, itemId) {
    e.preventDefault();
    e.stopPropagation();

    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.dataset.itemType = itemType;
    menu.dataset.itemId = itemId;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.remove('hidden');

    // Close menu on click elsewhere
    const closeMenu = () => {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function removeSidebarItem(itemType, itemId) {
    const config = getSidebarConfig();

    if (itemType === 'smart-list') {
        const item = config.smartLists.find(i => i.id === itemId);
        if (item) {
            item.visible = false;
            // If removing current list, switch to first visible
            if (state.currentList === itemId) {
                const firstVisible = config.smartLists.find(i => i.visible);
                if (firstVisible) selectSmartList(firstVisible.id);
            }
        }
    } else if (itemType === 'tool') {
        const item = config.tools.find(i => i.id === itemId);
        if (item) {
            item.visible = false;
            // If removing current view, switch to inbox
            if (state.currentView === item.view) {
                selectSmartList('inbox');
            }
        }
    }

    saveSidebarConfig(config);
    renderSmartLists();
    renderTools();
    showToast('Item removed. Click + to add it back.', 'info');
}

function openAddSidebarModal(section) {
    const modal = document.getElementById('add-sidebar-modal');
    const title = document.getElementById('add-sidebar-title');
    const itemsList = document.getElementById('available-sidebar-items');

    if (!modal || !title || !itemsList) return;

    const config = getSidebarConfig();

    let items = [];
    if (section === 'smart-lists') {
        title.textContent = 'Add Smart List';
        items = defaultSmartLists.map(def => {
            const current = config.smartLists.find(i => i.id === def.id);
            return {
                ...def,
                visible: current ? current.visible : true,
                customLabel: current?.customLabel
            };
        });
    } else if (section === 'tools') {
        title.textContent = 'Add Tool';
        items = defaultTools.map(def => {
            const current = config.tools.find(i => i.id === def.id);
            return {
                ...def,
                visible: current ? current.visible : true,
                customLabel: current?.customLabel
            };
        });
    }

    itemsList.innerHTML = items.map(item => `
        <div class="sidebar-item-option ${item.visible ? 'disabled' : ''}" 
             data-item-id="${item.id}" 
             data-section="${section}"
             onclick="${item.visible ? '' : `addSidebarItem('${section}', '${item.id}')`}">
            <span class="item-icon">${item.icon}</span>
            <span class="item-name">${escapeHTML(item.customLabel || item.label)}</span>
            <span class="item-status">${item.visible ? 'Already added' : 'Click to add'}</span>
        </div>
    `).join('');

    modal.classList.remove('hidden');
}

function closeAddSidebarModal() {
    const modal = document.getElementById('add-sidebar-modal');
    if (modal) modal.classList.add('hidden');
}

function addSidebarItem(section, itemId) {
    const config = getSidebarConfig();

    if (section === 'smart-lists') {
        const item = config.smartLists.find(i => i.id === itemId);
        if (item) item.visible = true;
    } else if (section === 'tools') {
        const item = config.tools.find(i => i.id === itemId);
        if (item) item.visible = true;
    }

    saveSidebarConfig(config);
    closeAddSidebarModal();
    renderSmartLists();
    renderTools();
    showToast('Item added!', 'success');
}

function openRenameModal(itemType, itemId) {
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-input');
    const itemIdField = document.getElementById('rename-item-id');
    const itemTypeField = document.getElementById('rename-item-type');

    if (!modal || !input || !itemIdField || !itemTypeField) return;

    const config = getSidebarConfig();
    let item;

    if (itemType === 'smart-list') {
        item = config.smartLists.find(i => i.id === itemId);
    } else if (itemType === 'tool') {
        item = config.tools.find(i => i.id === itemId);
    }

    if (!item) return;

    input.value = item.customLabel || item.label;
    itemIdField.value = itemId;
    itemTypeField.value = itemType;

    modal.classList.remove('hidden');
    input.focus();
    input.select();
}

function closeRenameModal() {
    const modal = document.getElementById('rename-modal');
    if (modal) modal.classList.add('hidden');
}

function handleRenameSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('rename-input');
    const itemId = document.getElementById('rename-item-id').value;
    const itemType = document.getElementById('rename-item-type').value;

    if (!input.value.trim()) return;

    const config = getSidebarConfig();
    let item;

    if (itemType === 'smart-list') {
        item = config.smartLists.find(i => i.id === itemId);
    } else if (itemType === 'tool') {
        item = config.tools.find(i => i.id === itemId);
    }

    if (item) {
        item.customLabel = input.value.trim();
        saveSidebarConfig(config);
        renderSmartLists();
        renderTools();
        showToast('Renamed successfully!', 'success');
    }

    closeRenameModal();
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
            <div class="item-actions">
                <button class="item-action-btn delete" title="Delete" onclick="event.stopPropagation(); deleteList('${list._id || list.id}')">×</button>
            </div>
        `;

        li.oncontextmenu = (e) => showContextMenu(e, 'custom-list', list._id || list.id);

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

async function deleteList(listId) {
    if (!confirm('Are you sure you want to delete this list? Tasks in this list will be moved to Inbox.')) {
        return;
    }

    try {
        await api.deleteList(listId);

        // Move tasks to inbox (no list)
        state.tasks.forEach(task => {
            if (task.list_id === listId) {
                task.list_id = null;
            }
        });

        // Remove from state
        state.lists = state.lists.filter(l => (l._id || l.id) !== listId);

        // If current list is deleted, switch to inbox
        if (state.currentList === listId) {
            selectSmartList('inbox');
        }

        renderLists();
        renderTasks();
        updateCounts();
        showToast('List deleted', 'success');
    } catch (error) {
        console.error('Delete list error:', error);
        showToast('Failed to delete list', 'error');
    }
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
    // Hide all calendar views first
    elements.calendarGrid.classList.add('hidden');
    if (elements.calendarDayView) elements.calendarDayView.classList.add('hidden');
    if (elements.calendarWeekView) elements.calendarWeekView.classList.add('hidden');
    if (elements.calendarAgendaView) elements.calendarAgendaView.classList.add('hidden');

    // Update active view mode button
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.calendarViewMode);
    });

    switch (state.calendarViewMode) {
        case 'day':
            renderDayView();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'agenda':
            renderAgendaView();
            break;
        case 'month':
        default:
            renderMonthView();
            break;
    }
}

function renderMonthView() {
    elements.calendarGrid.classList.remove('hidden');

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
        const date = new Date(year, month - 1, day);
        const dateStr = formatDateLocal(date);
        html += `<div class="calendar-day other-month" data-date="${dateStr}"><span class="day-number">${day}</span></div>`;
    }

    // Current month
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateLocal(date);
        const isToday = date.getTime() === today.getTime();
        const dayTasks = getTasksForDate(date);

        html += `
            <div class="calendar-day${isToday ? ' today' : ''}" data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${dayTasks.slice(0, 3).map(t => {
            const taskStatus = t.status || 'scheduled';
            const statusIcon = taskStatus === 'completed' ? '✓' : taskStatus === 'in_progress' ? '▶' : '';
            return `<div class="calendar-task status-${taskStatus}" data-task-id="${t._id || t.id}" draggable="true" onclick="toggleCalendarTask('${t._id || t.id}', event)">
                        ${statusIcon ? `<span class="cal-task-status">${statusIcon}</span>` : ''}
                        <span class="cal-task-title">${escapeHTML(t.title)}</span>
                    </div>`;
        }).join('')}
                ${dayTasks.length > 3 ? `<div class="calendar-more">+${dayTasks.length - 3} more</div>` : ''}
            </div>
        `;
    }

    // Next month padding
    const remaining = 42 - startPadding - totalDays;
    for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        const dateStr = formatDateLocal(date);
        html += `<div class="calendar-day other-month" data-date="${dateStr}"><span class="day-number">${i}</span></div>`;
    }

    elements.calendarGrid.innerHTML = html;
    setTimeout(() => initCalendarDragAndDrop(), 100);
}

function renderDayView() {
    if (!elements.calendarDayView) return;
    elements.calendarDayView.classList.remove('hidden');

    const date = state.calendarDate;
    const dayTasks = getTasksForDate(date);

    elements.calendarMonth.textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const hours = [];
    for (let h = 0; h < 24; h++) {
        const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        const hourTasks = dayTasks.filter(t => {
            if (!t.due_time) return h === 9; // Default to 9 AM
            const [taskHour] = t.due_time.split(':').map(Number);
            return taskHour === h;
        });

        hours.push(`
            <div class="day-hour-slot" data-hour="${h}">
                <div class="hour-label">${hourLabel}</div>
                <div class="hour-tasks">
                    ${hourTasks.map(t => `
                        <div class="calendar-task status-${t.status || 'scheduled'}" data-task-id="${t._id || t.id}" onclick="openTaskModal('${t._id || t.id}')">
                            ${escapeHTML(t.title)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    }

    const isToday = isSameDay(date, new Date());

    elements.calendarDayView.innerHTML = `
        <div class="day-view-header">
            <div class="day-view-date${isToday ? ' today' : ''}">${date.getDate()}</div>
            <div class="day-view-weekday">${date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
        </div>
        <div class="day-view-hours">${hours.join('')}</div>
    `;
}

function renderWeekView() {
    if (!elements.calendarWeekView) return;
    elements.calendarWeekView.classList.remove('hidden');

    // Get start of week (Sunday)
    const startOfWeek = new Date(state.calendarDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    elements.calendarMonth.textContent = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Header
    let headerHtml = '<div class="week-day-header"></div>'; // Empty corner
    for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + d);
        const isToday = date.getTime() === today.getTime();
        headerHtml += `
            <div class="week-day-header${isToday ? ' today' : ''}">
                <div class="week-day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div class="week-day-num">${date.getDate()}</div>
            </div>
        `;
    }

    // Time column
    let bodyHtml = '<div class="week-time-col">';
    for (let h = 0; h < 24; h++) {
        const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        bodyHtml += `<div class="week-time-slot">${hourLabel}</div>`;
    }
    bodyHtml += '</div>';

    // Day columns with positioned tasks
    for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + d);
        const dayTasks = getTasksForDate(date);
        const dateStr = formatDateLocal(date);

        // Process tasks to get time-based positioning
        const processedTasks = dayTasks.map(t => {
            // Parse start time
            let startMinutes = 9 * 60; // Default 9 AM
            if (t.dueTime) {
                const [h, m] = t.dueTime.split(':').map(Number);
                startMinutes = h * 60 + (m || 0);
            }
            // Duration: 1 hour by default for events
            const duration = t.googleEventId ? 60 : 30; // Google events 1hr, tasks 30min
            return {
                ...t,
                startMinutes,
                endMinutes: startMinutes + duration
            };
        }).sort((a, b) => a.startMinutes - b.startMinutes);

        // Calculate overlapping columns using a greedy algorithm
        const columns = [];
        processedTasks.forEach(task => {
            // Find a column where this task doesn't overlap
            let placed = false;
            for (let col = 0; col < columns.length; col++) {
                const lastInCol = columns[col][columns[col].length - 1];
                if (task.startMinutes >= lastInCol.endMinutes) {
                    columns[col].push(task);
                    task.column = col;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                task.column = columns.length;
                columns.push([task]);
            }
        });

        // Calculate max columns at any point for width calculation
        processedTasks.forEach(task => {
            let maxConcurrent = 1;
            processedTasks.forEach(other => {
                if (task !== other) {
                    // Check if overlaps
                    if (task.startMinutes < other.endMinutes && task.endMinutes > other.startMinutes) {
                        maxConcurrent = Math.max(maxConcurrent, Math.max(task.column, other.column) + 1);
                    }
                }
            });
            task.totalColumns = maxConcurrent;
        });

        // Build day column HTML
        bodyHtml += `<div class="week-day-col" data-date="${dateStr}">`;

        // Background hour slots (for visual grid)
        for (let h = 0; h < 24; h++) {
            bodyHtml += `<div class="week-hour-slot" data-hour="${h}"></div>`;
        }

        // Positioned tasks
        processedTasks.forEach(task => {
            const totalCols = Math.max(task.totalColumns, columns.length);
            const width = 100 / totalCols;
            const left = task.column * width;
            const top = (task.startMinutes / (24 * 60)) * 100;
            const height = Math.max(((task.endMinutes - task.startMinutes) / (24 * 60)) * 100, 2); // Min 2% height

            const bgColor = task.googleCalendarColor || '';
            const style = `
                position: absolute;
                top: ${top}%;
                left: ${left}%;
                width: calc(${width}% - 2px);
                height: ${height}%;
                min-height: 20px;
                ${bgColor ? `background: ${bgColor};` : ''}
            `.replace(/\s+/g, ' ');

            bodyHtml += `
                <div class="week-task-positioned status-${task.status || 'scheduled'}" 
                     data-task-id="${task._id || task.id}" 
                     style="${style}"
                     onclick="openTaskModal('${task._id || task.id}')">
                    <span class="week-task-time">${task.dueTime || ''}</span>
                    <span class="week-task-title">${escapeHTML(task.title)}</span>
                </div>
            `;
        });

        bodyHtml += '</div>';
    }

    elements.calendarWeekView.innerHTML = `
        <div class="week-view-header">${headerHtml}</div>
        <div class="week-view-body">${bodyHtml}</div>
    `;
}

function renderAgendaView() {
    if (!elements.calendarAgendaView) return;
    elements.calendarAgendaView.classList.remove('hidden');

    // Get current month for header
    const currentMonth = state.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    elements.calendarMonth.textContent = currentMonth;

    // Get tasks for next 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTasks = state.tasks
        .filter(t => {
            const taskDueDate = t.dueDate || t.due_date;
            if (!taskDueDate) return false;
            const taskDate = new Date(taskDueDate);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate >= today;
        })
        .sort((a, b) => {
            const dateA = new Date(a.dueDate || a.due_date);
            const dateB = new Date(b.dueDate || b.due_date);
            if (dateA.toDateString() !== dateB.toDateString()) {
                return dateA - dateB;
            }
            // Same day - sort by time
            const timeA = a.dueTime || a.due_time || '99:99';
            const timeB = b.dueTime || b.due_time || '99:99';
            return timeA.localeCompare(timeB);
        });

    if (upcomingTasks.length === 0) {
        elements.calendarAgendaView.innerHTML = '<div class="agenda-empty">No upcoming tasks</div>';
        return;
    }

    // Group by date
    const grouped = {};
    upcomingTasks.forEach(task => {
        const taskDate = task.dueDate || task.due_date;
        const dateKey = new Date(taskDate).toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
    });

    // Helper to format time
    const formatTime = (time) => {
        if (!time) return 'All Day';
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    // Helper to get end time (add 1 hour for Google events, 30 min for tasks)
    const getEndTime = (time, isGoogle) => {
        if (!time) return '';
        const [h, m] = time.split(':').map(Number);
        const addMinutes = isGoogle ? 60 : 30;
        let endH = h + Math.floor((m + addMinutes) / 60);
        let endM = (m + addMinutes) % 60;
        if (endH >= 24) endH -= 24;
        const ampm = endH >= 12 ? 'PM' : 'AM';
        const hour = endH % 12 || 12;
        return `${String(hour).padStart(2, '0')}:${String(endM).padStart(2, '0')} ${ampm}`;
    };

    let html = '';
    Object.keys(grouped).slice(0, 30).forEach(dateKey => {
        const date = new Date(dateKey);
        const dayNum = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = isSameDay(date, today);

        // Sort tasks: All Day first, then by time
        const dayTasks = grouped[dateKey].sort((a, b) => {
            const timeA = a.dueTime || a.due_time;
            const timeB = b.dueTime || b.due_time;
            if (!timeA && timeB) return -1; // All day first
            if (timeA && !timeB) return 1;
            if (!timeA && !timeB) return 0;
            return timeA.localeCompare(timeB);
        });

        html += `
            <div class="ticktick-agenda-day ${isToday ? 'today' : ''}">
                <div class="ticktick-agenda-date">
                    <span class="day-num ${isToday ? 'today' : ''}">${dayNum}</span>
                    <span class="day-name">${dayName}</span>
                </div>
                <div class="ticktick-agenda-events">
                    ${dayTasks.map(t => {
            const time = t.dueTime || t.due_time;
            const isGoogle = !!t.googleEventId;
            const bgColor = t.googleCalendarColor || '';
            const timeStart = formatTime(time);
            const timeEnd = time ? getEndTime(time, isGoogle) : '';
            const timeRange = time ? `${timeStart} - ${timeEnd}` : '';
            const isCompleted = t.status === 'completed';
            const hasPriority = t.priority && t.priority !== 'none';
            const priorityColor = t.priority === 'high' ? '#ff5630' :
                t.priority === 'medium' ? '#ffab00' :
                    t.priority === 'low' ? '#36b37e' : '';

            return `
                            <div class="ticktick-agenda-row">
                                <div class="ticktick-time-col">
                                    <span class="time-text">${time ? timeStart : 'All Day'}</span>
                                    ${isGoogle ? '<span class="calendar-icon">📅</span>' : ''}
                                </div>
                                <div class="ticktick-event-card ${isCompleted ? 'completed' : ''}"
                                     style="${bgColor ? `background: ${bgColor};` : ''} ${priorityColor && !bgColor ? `border-left: 3px solid ${priorityColor};` : ''}"
                                     data-task-id="${t._id || t.id}"
                                     onclick="openTaskModal('${t._id || t.id}')">
                                    ${time && isGoogle ? `<div class="event-time-range">${timeRange}</div>` : ''}
                                    <div class="event-title">${escapeHTML(t.title)}</div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    });

    elements.calendarAgendaView.innerHTML = `<div class="ticktick-agenda-container">${html}</div>`;
}

// Helper functions for calendar
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTasksForDate(date) {
    return state.tasks.filter(t => {
        // Support both dueDate (from backend) and due_date (legacy)
        const taskDueDate = t.dueDate || t.due_date;
        if (!taskDueDate) return false;
        const taskDate = new Date(taskDueDate);
        return isSameDay(taskDate, date);
    });
}

function isSameDay(d1, d2) {
    // Use toDateString for robust timezone-safe comparison
    return d1.toDateString() === d2.toDateString();
}

function setCalendarViewMode(mode) {
    state.calendarViewMode = mode;
    renderCalendar();
}

function goToToday() {
    state.calendarDate = new Date();
    renderCalendar();
}

function changeCalendarPeriod(delta) {
    switch (state.calendarViewMode) {
        case 'day':
            state.calendarDate.setDate(state.calendarDate.getDate() + delta);
            break;
        case 'week':
            state.calendarDate.setDate(state.calendarDate.getDate() + (delta * 7));
            break;
        case 'month':
        default:
            state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
            break;
        case 'agenda':
            // Agenda doesn't need navigation
            break;
    }
    renderCalendar();
}

// Legacy function for backward compatibility
function changeMonth(delta) {
    changeCalendarPeriod(delta);
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
            apiKey: document.getElementById('llm-api-key').value
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

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

async function loadGoogleCalendarStatus() {
    try {
        const config = await api.getCalendarConfig();
        const status = await api.getCalendarStatus();

        // Show/hide status sections
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

async function connectGoogleCalendar() {
    try {
        const response = await api.startGoogleAuth();

        if (response.authorization_url) {
            // Redirect directly to Google OAuth (like Todoist does)
            window.location.href = response.authorization_url;
        }
    } catch (error) {
        console.error('Connect Google Calendar error:', error);
        showToast(error.message || 'Failed to connect Google Calendar', 'error');
    }
}

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

// Import modal functions removed - auto-import on connect

async function syncGoogleCalendar() {
    try {
        showToast('Syncing calendar...', 'info');
        const response = await api.syncCalendar();

        if (response.count > 0) {
            await loadData();
            showToast(`Synced ${response.count} new events`, 'success');
        } else {
            showToast('No new events to sync', 'info');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showToast(error.message || 'Failed to sync calendar', 'error');
    }
}

// Check for Google auth callback in URL
function checkGoogleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('google_auth');
    const imported = urlParams.get('imported');

    if (authStatus === 'success') {
        const importedCount = parseInt(imported) || 0;
        if (importedCount > 0) {
            showToast(`Google Calendar connected! Imported ${importedCount} events as tasks.`, 'success');
            // Reload tasks to show imported events
            loadData();
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

        // If an action was executed by the AI, reload data and show confirmation
        if (result.action) {
            // Reload tasks to reflect changes made by AI
            await loadData();

            const actionMessages = {
                'create_task': '✅ Task created by AI',
                'complete_task': '✅ Task marked complete by AI',
                'delete_task': '✅ Task deleted by AI',
                'update_task': '✅ Task updated by AI'
            };

            const toastMessage = actionMessages[result.action] || 'Action completed';
            showToast(toastMessage, 'success');
        }
    } catch (error) {
        // Remove typing indicator
        document.getElementById(typingId)?.remove();

        const errorMessage = error.message.includes('not configured')
            ? 'AI is not configured. Please go to Settings and add your API key.'
            : (error.message || 'Sorry, I encountered an error. Please try again.');

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
    updateFocusStats();
    loadFocusHistory();

    // Set initial mode UI
    switchPomoMode(pomodoroState.mode);
}

function loadPomodoroSettings() {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
        Object.assign(pomodoroState.settings, JSON.parse(saved));
    }

    const workInput = document.getElementById('pomo-work-duration');
    const shortInput = document.getElementById('pomo-short-break');
    const longInput = document.getElementById('pomo-long-break');
    const sessionsInput = document.getElementById('pomo-sessions-count');

    if (workInput) workInput.value = pomodoroState.settings.workDuration;
    if (shortInput) shortInput.value = pomodoroState.settings.shortBreak;
    if (longInput) longInput.value = pomodoroState.settings.longBreak;
    if (sessionsInput) sessionsInput.value = pomodoroState.settings.sessionsBeforeLongBreak;

    // Listen for settings changes
    ['pomo-work-duration', 'pomo-short-break', 'pomo-long-break', 'pomo-sessions-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', savePomodoroSettings);
    });
}

function savePomodoroSettings() {
    pomodoroState.settings.workDuration = parseInt(document.getElementById('pomo-work-duration').value) || 25;
    pomodoroState.settings.shortBreak = parseInt(document.getElementById('pomo-short-break').value) || 5;
    pomodoroState.settings.longBreak = parseInt(document.getElementById('pomo-long-break').value) || 15;
    pomodoroState.settings.sessionsBeforeLongBreak = parseInt(document.getElementById('pomo-sessions-count').value) || 4;

    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroState.settings));

    if (!pomodoroState.isRunning && pomodoroState.mode === 'pomo' && !pomodoroState.isBreak) {
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
        updateTimerDisplay();
    }
}

function populatePomodoroTasks() {
    const select = document.getElementById('pomo-task-select');
    if (!select) return;

    const incompleteTasks = state.tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped');

    select.innerHTML = '<option value="">Select a task...</option>' +
        incompleteTasks.map(task =>
            `<option value="${task.id || task._id}">${escapeHTML(task.title)}</option>`
        ).join('');

    select.addEventListener('change', (e) => {
        pomodoroState.currentTaskId = e.target.value || null;
    });
}

function switchPomoMode(mode) {
    if (pomodoroState.isRunning) return; // Prevent switching while running

    pomodoroState.mode = mode;

    // Update tabs UI
    document.querySelectorAll('.pomo-tab').forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Reset timer state
    if (mode === 'pomo') {
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
    } else {
        pomodoroState.elapsedTime = 0;
    }

    updateTimerDisplay();
}

function startPomodoro() {
    const btn = document.getElementById('timer-start');

    if (pomodoroState.isRunning) {
        // Pause
        pomodoroState.isRunning = false;
        pomodoroState.isPaused = true;
        clearInterval(pomodoroState.interval);
        if (btn) btn.textContent = 'Go On';
    } else {
        // Start or Resume
        pomodoroState.isRunning = true;
        pomodoroState.isPaused = false;
        if (!pomodoroState.startTime) pomodoroState.startTime = new Date();

        if (btn) btn.textContent = 'Pause';

        pomodoroState.interval = setInterval(updatePomodoro, 1000);
    }
}

function exitPomodoro() {
    clearInterval(pomodoroState.interval);
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroState.isBreak = false;
    pomodoroState.startTime = null;

    if (pomodoroState.mode === 'pomo') {
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
    } else {
        pomodoroState.elapsedTime = 0;
    }

    const btn = document.getElementById('timer-start');
    if (btn) btn.textContent = 'Go On'; // TickTick uses "Go On" or "Start"? Original was "Go On"

    updateTimerDisplay();
}


function updatePomodoro() {
    if (pomodoroState.mode === 'pomo') {
        pomodoroState.timeLeft--;

        if (pomodoroState.timeLeft <= 0) {
            handlePomoComplete();
        }
    } else {
        pomodoroState.elapsedTime++;
    }

    updateTimerDisplay();
}

function updateTimerDisplay() {
    let seconds;
    let total;

    if (pomodoroState.mode === 'pomo') {
        seconds = pomodoroState.timeLeft;
        total = (pomodoroState.isBreak ?
            (pomodoroState.sessionsCompleted % pomodoroState.settings.sessionsBeforeLongBreak === 0 ?
                pomodoroState.settings.longBreak : pomodoroState.settings.shortBreak) :
            pomodoroState.settings.workDuration) * 60;
    } else {
        seconds = pomodoroState.elapsedTime;
        total = 60 * 60; // Just for progress ring context
    }

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const display = document.getElementById('timer-display');
    if (display) display.textContent = timeStr;

    // Update Ring
    const circle = document.getElementById('timer-progress');
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;

        let progress;
        if (pomodoroState.mode === 'pomo') {
            progress = 1 - (seconds / total);
        } else {
            // For stopwatch, maybe pulse or fill up every hour?
            progress = (seconds % 3600) / 3600;
        }

        const offset = circumference - (progress * circumference);
        circle.style.strokeDashoffset = offset;
    }
}

async function handlePomoComplete() {
    clearInterval(pomodoroState.interval);
    pomodoroState.isRunning = false;

    if (!pomodoroState.isBreak) {
        // Work session completed
        pomodoroState.sessionsCompleted++;
        const duration = pomodoroState.settings.workDuration;

        // Save session
        await saveFocusSession(duration, 'pomo');

        playNotificationSound();
        if (Notification.permission === 'granted') {
            new Notification('Focus Session Complete!', { body: 'Time for a break!' });
        }

        // Switch to break
        pomodoroState.isBreak = true;
        const isLongBreak = pomodoroState.sessionsCompleted % pomodoroState.settings.sessionsBeforeLongBreak === 0;
        pomodoroState.timeLeft = (isLongBreak ? pomodoroState.settings.longBreak : pomodoroState.settings.shortBreak) * 60;

        showToast(`Focus session complete! Take a ${isLongBreak ? 'long' : 'short'} break.`, 'success');

    } else {
        // Break completed
        playNotificationSound();
        if (Notification.permission === 'granted') {
            new Notification('Break Over!', { body: 'Ready to focus again?' });
        }

        pomodoroState.isBreak = false;
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;

        showToast('Break over! Ready to focus?', 'success');
    }

    const btn = document.getElementById('timer-start');
    if (btn) btn.textContent = 'Go On';

    updateTimerDisplay();
}

async function saveFocusSession(duration, type) {
    if (!duration) return;

    let taskTitle = "No Task";
    let taskTags = [];

    if (pomodoroState.currentTaskId) {
        const task = state.tasks.find(t => (t.id || t._id) === pomodoroState.currentTaskId);
        if (task) {
            taskTitle = task.title;
            taskTags = task.tags || [];
        }
    }

    const session = {
        taskId: pomodoroState.currentTaskId,
        taskTitle: taskTitle,
        tags: taskTags,
        duration: duration, // minutes
        startTime: pomodoroState.startTime ? pomodoroState.startTime.toISOString() : new Date(Date.now() - duration * 60000).toISOString(),
        endTime: new Date().toISOString(),
        type: type
    };

    try {
        await api.saveFocusSession(session);
        updateFocusStats();
        loadFocusHistory();
    } catch (error) {
        console.error('Failed to save session:', error);
        // Fallback to local storage (omitted for brevity, can implement if needed)
    }
}

async function updateFocusStats() {
    try {
        const stats = await api.getFocusStats();

        document.getElementById('today-pomos').textContent = stats.today.pomos;
        document.getElementById('today-duration').innerHTML = `${stats.today.duration}<span class="stat-unit">m</span>`;
        document.getElementById('total-pomos').textContent = stats.total.pomos;

        const h = Math.floor(stats.total.duration / 60);
        const m = stats.total.duration % 60;
        document.getElementById('total-duration').innerHTML = `${h}<span class="stat-unit">h</span> ${m}<span class="stat-unit">m</span>`;

        // Tag Stats
        const tagList = document.getElementById('tag-stats-list');
        const tagSection = document.getElementById('pomo-tag-stats');

        if (stats.byTag && stats.byTag.length > 0) {
            tagSection.classList.remove('hidden');
            tagList.innerHTML = stats.byTag.map(tag => `
                <div class="tag-stat-item">
                    <span class="tag-stat-name">#${tag.tag}</span>
                    <span class="tag-stat-duration">${tag.duration}m</span>
                </div>
            `).join('');
        } else {
            tagSection.classList.add('hidden');
        }

    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

async function loadFocusHistory() {
    try {
        const response = await api.getFocusSessions(20);
        const grouped = response.sessions || {};
        const list = document.getElementById('focus-record-list');

        if (!list) return;

        if (Object.keys(grouped).length === 0) {
            list.innerHTML = '<div class="focus-record-empty">No focus sessions yet. Start a timer to begin tracking!</div>';
            return;
        }

        let html = '';
        Object.keys(grouped).forEach(date => {
            const sessions = grouped[date];
            const dateLabel = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            html += `<div class="focus-record-date">${dateLabel}</div>`;

            sessions.forEach(s => {
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                const timeRange = `${formatTime(start)} - ${formatTime(end)}`;

                html += `
                    <div class="focus-record-item">
                        <div class="focus-record-icon">${s.type === 'pomo' ? '🍅' : '⏱️'}</div>
                        <div class="focus-record-details">
                            <div class="focus-record-time">${timeRange}</div>
                            <div class="focus-record-task">${escapeHTML(s.taskTitle || 'No Task')}</div>
                        </div>
                        <div class="focus-record-duration">${s.duration}m</div>
                    </div>
                `;
            });
        });

        list.innerHTML = html;

    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1idHx8fHx8fHx8fHx8fHx8fHx8fHx8fH19fX19fX19fX19fX19fX19fX19fX19fX19');
        audio.volume = 0.5;
        audio.play().catch(() => { });
    } catch (e) { }
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
    document.getElementById('stat-skipped').textContent = stats.skippedTasks || 0;
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

// Toggle task status from calendar click
async function toggleCalendarTask(id, e) {
    e.stopPropagation();
    e.preventDefault();

    // Don't complete on drag
    if (e.target.classList.contains('dragging')) return;

    await completeTask(id, e);
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
    const newDateStr = e.currentTarget.dataset.date; // Format: YYYY-MM-DD

    if (!taskId || !newDateStr) return;

    try {
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (!task) return;

        // Parse date correctly to avoid timezone issues
        // newDateStr is "YYYY-MM-DD", parse it as local date
        const [year, month, day] = newDateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues

        // Update task due date
        await api.updateTask(taskId, { dueDate: localDate.toISOString() });

        // Update local state
        task.dueDate = localDate.toISOString();

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
            window.notificationManager.showLocalNotification('NovaDo', {
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
        if (task.completed || !task.dueDate) return;

        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();

        // Only schedule for tasks due in the next 24 hours
        if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
            window.notificationManager.scheduleReminder(
                task.title,
                task.dueDate,
                task.id || task._id
            );
        }
    });
}

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

// Load Google Calendar connection status
async function loadGoogleCalendarStatus() {
    try {
        const config = await api.getCalendarConfig();
        const status = await api.getCalendarStatus();

        const notConfigured = document.getElementById('gcal-not-configured');
        const disconnected = document.getElementById('gcal-disconnected');
        const connected = document.getElementById('gcal-connected');
        const calendarsList = document.getElementById('gcal-calendars-list');
        const calendarsContainer = document.getElementById('gcal-calendars-container');
        const saveBtn = document.getElementById('save-calendars-btn');

        if (!config.configured) {
            notConfigured?.classList.remove('hidden');
            disconnected?.classList.add('hidden');
            connected?.classList.add('hidden');
            if (calendarsList) calendarsList.classList.add('hidden');
            return;
        }

        notConfigured?.classList.add('hidden');

        if (status.connected) {
            disconnected?.classList.add('hidden');
            connected?.classList.remove('hidden');
            const emailEl = document.getElementById('gcal-email');
            if (emailEl) emailEl.textContent = status.email || 'Connected';

            // Load Calendars List
            if (calendarsList && calendarsContainer) {
                try {
                    const calResult = await api.listCalendars();

                    if (calResult.calendars) {
                        calendarsList.classList.remove('hidden');
                        calendarsContainer.innerHTML = '';

                        calResult.calendars.forEach(cal => {
                            const div = document.createElement('div');
                            div.className = 'gcal-calendar-item';
                            div.style.display = 'flex';
                            div.style.alignItems = 'center';
                            div.style.gap = '0.5rem';

                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.id = `cal-${cal.id}`;
                            checkbox.value = cal.id;
                            checkbox.checked = cal.selected;

                            checkbox.onchange = () => {
                                if (saveBtn) saveBtn.classList.remove('hidden');
                            };

                            const label = document.createElement('label');
                            label.htmlFor = `cal-${cal.id}`;
                            label.textContent = cal.name;
                            label.style.display = 'flex';
                            label.style.alignItems = 'center';
                            label.style.gap = '0.5rem';
                            label.style.cursor = 'pointer';
                            label.style.color = 'var(--text-primary)';

                            const colorDot = document.createElement('span');
                            colorDot.style.width = '12px';
                            colorDot.style.height = '12px';
                            colorDot.style.borderRadius = '50%';
                            colorDot.style.backgroundColor = cal.color;

                            label.prepend(colorDot);

                            div.appendChild(checkbox);
                            div.appendChild(label);
                            calendarsContainer.appendChild(div);
                        });

                        if (saveBtn) {
                            saveBtn.onclick = async () => {
                                const selectedIds = Array.from(calendarsContainer.querySelectorAll('input:checked')).map(cb => cb.value);
                                try {
                                    await api.selectCalendars(selectedIds);
                                    showToast('Calendar selection saved', 'success');
                                    saveBtn.classList.add('hidden');
                                } catch (err) {
                                    showToast('Failed to save selection', 'error');
                                }
                            };
                        }
                    }
                } catch (calErr) {
                    console.error("Failed to list calendars", calErr);
                }
            }
        } else {
            disconnected?.classList.remove('hidden');
            connected?.classList.add('hidden');
            if (calendarsList) calendarsList.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to load Google Calendar status:', error);
    }
}

// Connect Google Calendar - redirect to OAuth
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

// Disconnect Google Calendar
async function disconnectGoogleCalendar() {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will not delete any imported tasks.')) {
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

// Sync Google Calendar - import new events
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

// Check for OAuth callback parameters on page load
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
