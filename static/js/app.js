/**
 * NovaDo Application
 */

// Reference to window.api (created in api.js, loaded before this script)
const api = window.api;

// Helper function to parse date strings without timezone conversion
// Backend sends dates as "YYYY-MM-DD" and we need to treat them as local dates
function parseDateString(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;
    
    // Extract just the date part if datetime string
    let dateOnlyStr = dateStr;
    if (dateStr.includes('T')) {
        dateOnlyStr = dateStr.split('T')[0];
    }
    
    // Parse as local date (YYYY-MM-DD)
    const parts = dateOnlyStr.split('-');
    if (parts.length !== 3) return null;
    
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    return new Date(year, month - 1, day);
}

// Helper function to get today's date at midnight (local time)
function getTodayAtMidnight() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// State
const state = {
    user: null,
    tasks: [],
    lists: [],
    habits: [],
    tags: [],  // Hierarchical tag system
    currentView: 'inbox',
    currentList: null,
    currentTag: null,  // Currently selected tag for filtering
    calendarDate: new Date(),
    calendarViewMode: 'month' // 'day', 'week', 'month', 'agenda'
};

// Sidebar configuration - Uses Lucide icon names (https://lucide.dev/icons)
const defaultSmartLists = [
    { id: 'inbox', icon: 'inbox', label: 'Inbox', countId: 'inbox-count' },
    { id: 'today', icon: 'sun', label: 'Today', countId: 'today-count' },
    { id: 'week', icon: 'calendar-days', label: 'Next 7 Days', countId: 'week-count' },
    { id: 'all', icon: 'list-todo', label: 'All Tasks', countId: 'all-count' }
];

// Task Status items (separate section at bottom)
const taskStatusItems = [
    { id: 'completed', icon: 'circle-check', label: 'Completed', countId: 'completed-count' },
    { id: 'wont-do', icon: 'x-circle', label: "Won't Do", countId: 'wont-do-count' }
];

const defaultTools = [
    { id: 'matrix', icon: 'grid-2x2', label: 'Task Matrix', view: 'matrix' },
    { id: 'habits', icon: 'target', label: 'Habits', view: 'habits' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar', view: 'calendar' },
    { id: 'pomodoro', icon: 'timer', label: 'Pomodoro', view: 'pomodoro' },
    { id: 'stats', icon: 'bar-chart-3', label: 'Statistics', view: 'stats' }
];

// Sidebar config version - increment when schema changes
const SIDEBAR_CONFIG_VERSION = 2; // v2: moved completed/wont-do to Task Status section

// Get sidebar config from localStorage or use defaults
function getSidebarConfig() {
    const saved = localStorage.getItem('sidebarConfig');
    const savedVersion = localStorage.getItem('sidebarConfigVersion');

    // Force reset if version changed (schema migration)
    if (savedVersion !== String(SIDEBAR_CONFIG_VERSION)) {
        localStorage.removeItem('sidebarConfig');
        localStorage.setItem('sidebarConfigVersion', String(SIDEBAR_CONFIG_VERSION));
        // Return fresh defaults
        return {
            smartLists: defaultSmartLists.map(l => ({ ...l, visible: true, customLabel: null })),
            tools: defaultTools.map(t => ({ ...t, visible: true, customLabel: null }))
        };
    }

    if (saved) {
        const config = JSON.parse(saved);

        // Merge with defaults to ensure new lists appear
        const newDefaultLists = defaultSmartLists.filter(def =>
            !config.smartLists.some(savedItem => savedItem.id === def.id)
        ).map(l => ({ ...l, visible: true, customLabel: null }));

        if (newDefaultLists.length > 0) {
            config.smartLists = [...config.smartLists, ...newDefaultLists];
        }

        // Also merge new default tools (like Task Matrix) for existing users
        const newDefaultTools = defaultTools.filter(def =>
            !config.tools.some(savedItem => savedItem.id === def.id)
        ).map(t => ({ ...t, visible: true, customLabel: null }));

        if (newDefaultTools.length > 0) {
            config.tools = [...config.tools, ...newDefaultTools];
        }

        // Save if any new items were added
        if (newDefaultLists.length > 0 || newDefaultTools.length > 0) {
            saveSidebarConfig(config);
        }

        return config;
    }
    return {
        smartLists: defaultSmartLists.map(l => ({ ...l, visible: true, customLabel: null })),
        tools: defaultTools.map(t => ({ ...t, visible: true, customLabel: null }))
    };
}

function saveSidebarConfig(config) {
    localStorage.setItem('sidebarConfig', JSON.stringify(config));
}

// DOM Elements - Use getters for lazy loading to handle any DOM timing issues
const elements = {
    get loadingScreen() { return document.getElementById('loading-screen'); },
    get authScreen() { return document.getElementById('auth-screen'); },
    get mainScreen() { return document.getElementById('main-screen'); },
    get loginForm() { return document.getElementById('login-form'); },
    get registerForm() { return document.getElementById('register-form'); },
    get loginError() { return document.getElementById('login-error'); },
    get registerError() { return document.getElementById('register-error'); },
    get tabBtns() { return document.querySelectorAll('.tab-btn'); },
    get userName() { return document.querySelector('.user-name'); },
    get currentViewTitle() { return document.getElementById('current-view-title'); },
    get tasksList() { return document.getElementById('tasks-list'); },
    get emptyState() { return document.getElementById('empty-state'); },
    get customLists() { return document.getElementById('custom-lists'); },
    get smartLists() { return document.getElementById('smart-lists'); },
    get habitsView() { return document.getElementById('habits-view'); },
    get habitsList() { return document.getElementById('habits-list'); },
    get calendarView() { return document.getElementById('calendar-view'); },
    get calendarGrid() { return document.getElementById('calendar-grid'); },
    get calendarMonth() { return document.getElementById('calendar-month'); },
    get calendarDayView() { return document.getElementById('calendar-day-view'); },
    get calendarWeekView() { return document.getElementById('calendar-week-view'); },
    get calendarAgendaView() { return document.getElementById('calendar-agenda-view'); },
    get settingsView() { return document.getElementById('settings-view'); },
    get tasksView() { return document.getElementById('tasks-view'); },
    get taskModal() { return document.getElementById('task-modal'); },
    get listModal() { return document.getElementById('list-modal'); },
    get habitModal() { return document.getElementById('habit-modal'); },
    get smartModal() { return document.getElementById('smart-input-modal'); },
    get searchInput() { return document.getElementById('search-input'); },
    get pomodoroView() { return document.getElementById('pomodoro-view'); },
    get statsView() { return document.getElementById('stats-view'); }
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

// Trigger bidirectional calendar sync
let syncInProgress = false;

async function triggerCalendarSync() {
    if (syncInProgress) {
        showToast('Sync already in progress...', 'info');
        return;
    }

    // Get both possible sync buttons (header and floating FAB)
    const syncBtn = document.getElementById('sync-calendar-btn');
    const syncFab = document.getElementById('sync-fab-btn');
    const syncIcon = syncBtn?.querySelector('.sync-icon');
    const syncFabIcon = syncFab?.querySelector('.ai-fab-icon');

    try {
        syncInProgress = true;

        // Add spinning animation to both buttons
        if (syncIcon) syncIcon.classList.add('spinning');
        if (syncFabIcon) syncFabIcon.classList.add('spinning');
        if (syncBtn) syncBtn.disabled = true;
        if (syncFab) syncFab.disabled = true;

        showToast('Syncing with Google Calendar...', 'info');

        const result = await api.bidirectionalSync();

        if (result.success) {
            showToast('✓ Calendar sync complete!', 'success');
            // Refresh data after sync WITHOUT changing the current view
            await refreshDataWithoutNavigation();
        } else {
            showToast(result.message || 'Sync completed with warnings', 'warning');
        }

    } catch (error) {
        console.error('[SYNC] Error:', error);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            showToast('Please connect Google Calendar in Settings first', 'error');
        } else {
            showToast('Sync failed: ' + error.message, 'error');
        }
    } finally {
        syncInProgress = false;

        // Remove spinning animation from both buttons
        if (syncIcon) syncIcon.classList.remove('spinning');
        if (syncFabIcon) syncFabIcon.classList.remove('spinning');
        if (syncBtn) syncBtn.disabled = false;
        if (syncFab) syncFab.disabled = false;
    }
}

async function init() {
    try {
        try { setupEventListeners(); } catch (e) { console.error('[init] setupEventListeners failed:', e); }
        try { initSidebarDragDrop(); } catch (e) { console.error('[init] initSidebarDragDrop failed:', e); }
        try { initSidebarResize(); } catch (e) { console.error('[init] initSidebarResize failed:', e); }
        try { checkGoogleAuthCallback(); } catch (e) { console.error('[init] checkGoogleAuthCallback failed:', e); }
        await checkAuth();
    } catch (error) {
        console.error('Init error:', error);
        // Direct DOM manipulation as fallback - no function calls that could fail
        try {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            const authScreen = document.getElementById('auth-screen');
            if (authScreen) authScreen.classList.remove('hidden');
        } catch (e) {
            console.error('Fallback also failed:', e);
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

    // Buttons - with null checks
    const addTaskBtn = document.getElementById('add-task-btn');
    const addListBtn = document.getElementById('add-list-btn');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal());
    if (addListBtn) addListBtn.addEventListener('click', () => openListModal());
    if (addHabitBtn) addHabitBtn.addEventListener('click', () => openHabitModal());
    if (settingsBtn) settingsBtn.addEventListener('click', () => showView('settings'));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Sync button (header)
    const syncBtn = document.getElementById('sync-calendar-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', triggerCalendarSync);
    }

    // Sync button (settings page)
    const syncSettingsBtn = document.getElementById('sync-calendar-settings-btn');
    if (syncSettingsBtn) {
        syncSettingsBtn.addEventListener('click', triggerCalendarSync);
    }

    // Sync FAB (floating button)
    const syncFab = document.getElementById('sync-fab-btn');
    if (syncFab) {
        syncFab.addEventListener('click', triggerCalendarSync);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+S - Trigger calendar sync
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            triggerCalendarSync();
        }
    });

    // Quick add task input
    const quickTaskInput = document.getElementById('quick-task-input');
    if (quickTaskInput) {
        quickTaskInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const title = e.target.value.trim();
                e.target.value = '';
                try {
                    // Build task data based on current view context
                    const taskData = { title };

                    // Set list if in a custom list view
                    if (state.currentList && !['inbox', 'today', 'week', 'all', 'completed'].includes(state.currentList)) {
                        taskData.list = state.currentList;
                    }

                    // Set due date based on current smart list
                    if (state.currentList === 'today') {
                        // Set due date to today at 11:59 PM
                        const today = new Date();
                        today.setHours(23, 59, 0, 0);
                        taskData.due_date = today.toISOString();
                    } else if (state.currentList === 'week') {
                        // Set due date to today at 11:59 PM (task is for this week)
                        const today = new Date();
                        today.setHours(23, 59, 0, 0);
                        taskData.due_date = today.toISOString();
                    }

                    // Add tag if in a tag view
                    if (state.currentTag) {
                        taskData.tags = [state.currentTag];
                    }

                    const result = await api.createTask(taskData);
                    // Add the new task to state and re-render
                    state.tasks.push(result);
                    renderTasks();
                    showToast('Task added', 'success');
                } catch (error) {
                    console.error('[Quick Add] Failed to add task:', error.message, error);
                    showToast('Failed to add task: ' + error.message, 'error');
                }
            }
        });
    }

    // Task modal
    document.getElementById('close-task-modal').addEventListener('click', closeTaskModal);
    document.getElementById('cancel-task').addEventListener('click', closeTaskModal);
    document.querySelector('#task-modal .modal-overlay').addEventListener('click', closeTaskModal);
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Make date and time inputs open picker on click
    const dateInput = document.getElementById('task-due-date');
    const timeInput = document.getElementById('task-due-time');
    if (dateInput) {
        dateInput.addEventListener('click', () => {
            try { dateInput.showPicker(); } catch (e) { /* Browser doesn't support showPicker */ }
        });
    }
    if (timeInput) {
        timeInput.addEventListener('click', () => {
            try { timeInput.showPicker(); } catch (e) { /* Browser doesn't support showPicker */ }
        });
    }

    // Reminder toggle - show/hide config
    const reminderToggle = document.getElementById('task-reminder-enabled');
    const reminderConfig = document.getElementById('reminder-config');
    if (reminderToggle && reminderConfig) {
        reminderToggle.addEventListener('change', () => {
            reminderConfig.style.display = reminderToggle.checked ? 'block' : 'none';
        });
    }

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
    document.querySelectorAll('.theme-card').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Google Calendar
    document.getElementById('connect-google-btn')?.addEventListener('click', connectGoogleCalendar);
    document.getElementById('disconnect-google-btn')?.addEventListener('click', disconnectGoogleCalendar);
    document.getElementById('sync-calendar-btn')?.addEventListener('click', syncGoogleCalendar);

    // Load Google Calendar status when settings view is shown
    // (settingsBtn already declared above at line 211)
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
                if (itemType === 'tag') {
                    // Check if it's a discovered tag
                    if (itemId && itemId.startsWith('discovered_')) {
                        showToast('Cannot rename auto-discovered tags. Create it explicitly first.', 'error');
                        return;
                    }
                }
                openRenameModal(itemType, itemId);
            } else if (action === 'duplicate') {
                if (itemType === 'tag') {
                    // Duplicate tag functionality
                    duplicateTag(itemId);
                } else {
                    duplicateSidebarItem(itemType, itemId);
                }
            } else if (action === 'delete') {
                if (itemType === 'custom-list') {
                    deleteList(itemId);
                } else if (itemType === 'tag') {
                    // Check if it's a discovered tag
                    if (itemId && itemId.startsWith('discovered_')) {
                        showToast('Cannot delete auto-discovered tags. Remove them from tasks instead.', 'error');
                        return;
                    }
                    deleteTag(itemId);
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

    // Load saved theme - default to 'midnight-minimal' (dark theme)
    const savedTheme = localStorage.getItem('theme') || 'midnight-minimal';
    setTheme(savedTheme);

    // Avatar upload handler
    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }

    // Load saved avatar
    loadSavedAvatar();

    // Timezone selector - only register event handlers here (loadTimezone called in loadData after auth)
    const timezoneSelect = document.getElementById('timezone-select');
    if (timezoneSelect) {
        timezoneSelect.addEventListener('change', async (e) => {
            const timezone = e.target.value;
            try {
                await api.updatePreferences({ timezone });
                const status = document.getElementById('timezone-save-status');
                if (status) {
                    status.textContent = '✓ Timezone saved. Re-sync calendar for changes to take effect.';
                    status.style.color = 'var(--success)';
                    setTimeout(() => status.textContent = '', 3000);
                }
            } catch (error) {
                console.error('Failed to save timezone:', error);
                showToast('Failed to save timezone', 'error');
            }
        });
    }

    // Auto-detect timezone button
    const detectTimezoneBtn = document.getElementById('detect-timezone-btn');
    if (detectTimezoneBtn) {
        detectTimezoneBtn.addEventListener('click', async () => {
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const select = document.getElementById('timezone-select');

            // Try to find matching option
            const option = Array.from(select.options).find(opt => opt.value === browserTimezone);
            if (option) {
                select.value = browserTimezone;
                select.dispatchEvent(new Event('change'));
            } else {
                // Add the detected timezone as an option if not in list
                const newOption = document.createElement('option');
                newOption.value = browserTimezone;
                newOption.textContent = browserTimezone + ' (detected)';
                select.appendChild(newOption);
                select.value = browserTimezone;
                select.dispatchEvent(new Event('change'));
            }
            showToast(`Detected timezone: ${browserTimezone}`, 'success');
        });
    }
}

// Load user's timezone preference
async function loadTimezone() {
    try {
        const { preferences } = await api.getPreferences();
        const timezone = preferences?.timezone;
        const select = document.getElementById('timezone-select');

        if (timezone && select) {
            // Check if timezone exists in options
            const option = Array.from(select.options).find(opt => opt.value === timezone);
            if (option) {
                select.value = timezone;
            } else {
                // Add it as an option
                const newOption = document.createElement('option');
                newOption.value = timezone;
                newOption.textContent = timezone;
                select.appendChild(newOption);
                select.value = timezone;
            }
        } else if (!timezone && select) {
            // Auto-detect on first load if no timezone set
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const option = Array.from(select.options).find(opt => opt.value === browserTimezone);
            if (option) {
                select.value = browserTimezone;
                // Auto-save detected timezone
                await api.updatePreferences({ timezone: browserTimezone });
            }
        }
    } catch (error) {
        console.error('Failed to load timezone:', error);
    }
}

// Handle avatar upload
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');

        if (avatarImg && avatarPlaceholder) {
            avatarImg.src = event.target.result;
            avatarImg.classList.remove('hidden');
            avatarPlaceholder.classList.add('hidden');

            // Save to localStorage
            localStorage.setItem('userAvatar', event.target.result);

            // Update sidebar avatar if exists
            updateSidebarAvatar(event.target.result);

            showToast('Profile picture updated!', 'success');
        }
    };
    reader.readAsDataURL(file);
}

// Load saved avatar from localStorage
function loadSavedAvatar() {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');

        if (avatarImg && avatarPlaceholder) {
            avatarImg.src = savedAvatar;
            avatarImg.classList.remove('hidden');
            avatarPlaceholder.classList.add('hidden');
        }

        // Update sidebar avatar
        updateSidebarAvatar(savedAvatar);
    }
}

// Update sidebar user avatar
function updateSidebarAvatar(avatarSrc) {
    const sidebarAvatar = document.querySelector('.user-avatar');
    if (sidebarAvatar && avatarSrc) {
        // Remove emoji if present
        sidebarAvatar.textContent = '';
        // Create and add image
        const img = document.createElement('img');
        img.src = avatarSrc;
        img.alt = 'User';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center top'; // Focus on face
        sidebarAvatar.appendChild(img);
    }
}

// Auth
async function checkAuth() {
    if (!api.token) {
        showAuthScreen();
        hideLoadingScreen();
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
    } finally {
        hideLoadingScreen();
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
function hideLoadingScreen() {
    if (elements.loadingScreen) {
        elements.loadingScreen.classList.add('hidden');
    }
}

function showAuthScreen() {
    if (elements.authScreen) elements.authScreen.classList.remove('hidden');
    if (elements.loadingScreen) elements.loadingScreen.classList.add('hidden');
    if (elements.mainScreen) elements.mainScreen.classList.add('hidden');
}

function showMainScreen() {
    if (elements.authScreen) elements.authScreen.classList.add('hidden');
    if (elements.mainScreen) elements.mainScreen.classList.remove('hidden');
    if (elements.userName) elements.userName.textContent = state.user?.name || 'User';
    const settingsName = document.getElementById('settings-name');
    const settingsEmail = document.getElementById('settings-email');
    if (settingsName) settingsName.value = state.user?.name || '';
    if (settingsEmail) settingsEmail.value = state.user?.email || '';
    // Load user avatar if available
    if (state.user?.avatar) {
        try { updateSidebarAvatar(state.user.avatar); } catch (e) { console.error('updateSidebarAvatar failed:', e); }
    } else {
        // Try loading from localStorage
        try { loadSavedAvatar(); } catch (e) { console.error('loadSavedAvatar failed:', e); }
    }
}

// Data Loading
async function loadData() {
    try {
        // Render sidebar first (from local config) - with error handling
        try { renderSmartLists(); } catch (e) { console.error('[loadData] renderSmartLists failed:', e); }
        try { renderTools(); } catch (e) { console.error('[loadData] renderTools failed:', e); }
        try { renderTaskStatus(); } catch (e) { console.error('[loadData] renderTaskStatus failed:', e); }

        // Fetch data with individual error handling for each API call
        const [tasks, lists, habits, tags] = await Promise.all([
            api.getTasks().catch(e => { console.error('[loadData] getTasks failed:', e); return []; }),
            api.getLists().catch(e => { console.error('[loadData] getLists failed:', e); return []; }),
            api.getHabits().catch(e => { console.error('[loadData] getHabits failed:', e); return []; }),
            api.getTags().catch(e => { console.error('[loadData] getTags failed:', e); return []; })
        ]);

        state.tasks = Array.isArray(tasks) ? tasks : [];
        state.lists = Array.isArray(lists) ? lists : [];
        state.habits = Array.isArray(habits) ? habits : [];
        state.tags = Array.isArray(tags) ? tags : [];

        console.log('[loadData] Loaded:', state.tasks.length, 'tasks,', state.lists.length, 'lists,', state.habits.length, 'habits,', state.tags.length, 'tags');

        // Render with error handling
        try { renderLists(); } catch (e) { console.error('[loadData] renderLists failed:', e); }
        try { renderTags(); } catch (e) { console.error('[loadData] renderTags failed:', e); }
        try { renderTasks(); } catch (e) { console.error('[loadData] renderTasks failed:', e); }
        try { updateCounts(); } catch (e) { console.error('[loadData] updateCounts failed:', e); }

        // Load timezone settings now that user is authenticated
        try { loadTimezone(); } catch (e) { console.error('[loadData] loadTimezone failed:', e); }

        // URL-based navigation: Check URL path and navigate to appropriate view
        try { navigateFromUrl(); } catch (e) { console.error('[loadData] navigateFromUrl failed:', e); }
    } catch (error) {
        console.error('[loadData] Critical error:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load data', 'error');
        }
    }
}

// Refresh data without navigation (for sync, updates, etc.)
async function refreshDataWithoutNavigation() {
    try {
        // Fetch updated data
        const [tasks, lists, habits, tags] = await Promise.all([
            api.getTasks().catch(e => { console.error('[refresh] getTasks failed:', e); return []; }),
            api.getLists().catch(e => { console.error('[refresh] getLists failed:', e); return []; }),
            api.getHabits().catch(e => { console.error('[refresh] getHabits failed:', e); return []; }),
            api.getTags().catch(e => { console.error('[refresh] getTags failed:', e); return []; })
        ]);

        state.tasks = Array.isArray(tasks) ? tasks : [];
        state.lists = Array.isArray(lists) ? lists : [];
        state.habits = Array.isArray(habits) ? habits : [];
        state.tags = Array.isArray(tags) ? tags : [];

        console.log('[refresh] Refreshed:', state.tasks.length, 'tasks,', state.lists.length, 'lists');

        // Re-render current view without changing navigation
        try { renderLists(); } catch (e) { console.error('[refresh] renderLists failed:', e); }
        try { renderTags(); } catch (e) { console.error('[refresh] renderTags failed:', e); }
        try { renderTasks(); } catch (e) { console.error('[refresh] renderTasks failed:', e); }
        try { updateCounts(); } catch (e) { console.error('[refresh] updateCounts failed:', e); }
    } catch (error) {
        console.error('[refresh] Error:', error);
    }
}

// URL-based view navigation
function navigateFromUrl() {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');

    // Map URL paths to views
    const pathToView = {
        '/calendar': 'calendar',
        '/matrix': 'matrix',
        '/habits': 'habits',
        '/pomodoro': 'pomodoro',
        '/stats': 'stats',
        '/settings': 'settings',
        '/today': 'today',
        '/week': 'week',
        '/inbox': 'inbox',
        '/dashboard': 'inbox'
    };

    // Check for view in path
    for (const [urlPath, viewName] of Object.entries(pathToView)) {
        if (path.includes(urlPath)) {
            console.log('[navigateFromUrl] Navigating to view:', viewName, 'from path:', path);
            showView(viewName);
            return;
        }
    }

    // Check for view query param (?view=calendar)
    if (viewParam && pathToView['/' + viewParam]) {
        console.log('[navigateFromUrl] Navigating to view from query param:', viewParam);
        showView(viewParam);
        return;
    }

    // Check for window.NOVADO_DEFAULT_VIEW (set by separate page templates)
    if (window.NOVADO_DEFAULT_VIEW) {
        console.log('[navigateFromUrl] Using default view:', window.NOVADO_DEFAULT_VIEW);
        showView(window.NOVADO_DEFAULT_VIEW);
        return;
    }

    // Check localStorage for last viewed view (for page reload persistence)
    const savedView = localStorage.getItem('currentView');
    if (savedView && savedView !== 'settings') {  // Don't restore settings view
        console.log('[navigateFromUrl] Restoring saved view from localStorage:', savedView);

        // Special handling for tag view - need to also restore the tag
        if (savedView === 'tag') {
            const savedTag = localStorage.getItem('currentTag');
            if (savedTag) {
                console.log('[navigateFromUrl] Restoring saved tag:', savedTag);
                selectTag(savedTag);
                return;
            }
        }

        showView(savedView);
        return;
    }

    // Default to inbox
    console.log('[navigateFromUrl] Defaulting to inbox view');
    showView('inbox');
}

// Update URL when view changes (for back/forward navigation)
function updateUrlForView(view) {
    const viewToPath = {
        'calendar': '/calendar',
        'matrix': '/matrix',
        'habits': '/habits',
        'pomodoro': '/pomodoro',
        'stats': '/stats',
        'settings': '/settings',
        'today': '/?view=today',
        'week': '/?view=week',
        'inbox': '/',
        'all': '/?view=all',
        'completed': '/?view=completed',
        'wont-do': '/?view=wont-do'
    };

    const newPath = viewToPath[view] || '/';

    // Only update if path is different to avoid loop
    if (window.location.pathname !== newPath && !newPath.startsWith('/?')) {
        window.history.pushState({ view }, '', newPath);
    } else if (newPath.startsWith('/?')) {
        window.history.pushState({ view }, '', newPath);
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view) {
        showView(event.state.view);
    } else {
        navigateFromUrl();
    }
});

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
            const taskDate = parseDateString(task.dueDate);
            return taskDate && taskDate.getTime() === targetDate.getTime();
        });

        // Limit display to 3 tasks
        const displayTasks = dayTasks.slice(0, 3);

        displayTasks.forEach(task => {
            const taskEl = document.createElement('div');

            // Calculate event duration for short-duration optimization (Requirements 3.3)
            let duration = 0;
            if (task.dueDate && task.startTime) {
                const start = new Date(task.startTime);
                const end = new Date(task.dueDate);
                duration = (end - start) / (1000 * 60); // duration in minutes
            }

            // Get enhanced styling with theme integration
            const styleConfig = getEnhancedEventCardStyles({
                ...task,
                duration,
                googleCalendarColor: task.googleCalendarColor
            }, document.documentElement.dataset.theme, 'month');

            // Apply unified CSS classes for theme colors
            const cssClasses = [
                'calendar-task-item',
                styleConfig.classes
            ].filter(Boolean).join(' ');

            // Apply styles
            taskEl.className = cssClasses;
            if (styleConfig.style) {
                taskEl.style.cssText = styleConfig.style; // Only Google Calendar colors
            }

            // Create structured content with time and title (Requirements 3.6)
            const eventContent = document.createElement('div');
            eventContent.style.display = 'flex';
            eventContent.style.alignItems = 'center';
            eventContent.style.width = '100%';

            // Add time if available (bold timestamps - Requirements 3.6)
            if (task.dueDate || task.dueTime || task.due_time) {
                const timeEl = document.createElement('span');
                timeEl.className = 'event-time';

                // Fix time translation for prayer calendar and other synced events
                let timeToDisplay = '';
                if (task.dueTime || task.due_time) {
                    const fixedTime = fixTimeTranslation(task.dueTime || task.due_time, !!task.googleEventId);
                    timeToDisplay = formatTimeDisplay(fixedTime);
                } else if (task.dueDate) {
                    const taskDate = new Date(task.dueDate);
                    if (taskDate.getHours() !== 0 || taskDate.getMinutes() !== 0) {
                        const timeStr = `${taskDate.getHours().toString().padStart(2, '0')}:${taskDate.getMinutes().toString().padStart(2, '0')}`;
                        timeToDisplay = formatTimeDisplay(timeStr);
                    }
                }

                if (timeToDisplay) {
                    timeEl.textContent = timeToDisplay;
                    eventContent.appendChild(timeEl);
                }
            }

            // Add title with truncation support (Requirements 3.4)
            const titleEl = document.createElement('span');
            titleEl.className = 'event-title';
            titleEl.textContent = task.title;
            eventContent.appendChild(titleEl);

            taskEl.appendChild(eventContent);

            // Enhanced tooltip for long titles (Requirements 3.4)
            if (task.title.length > 25) {
                taskEl.title = `${task.title}${task.description ? '\n' + task.description : ''}`;
            } else {
                taskEl.title = task.title;
            }

            // Make task clickable
            taskEl.onclick = (e) => {
                e.stopPropagation();
                openTaskModal(task._id);
            };

            // Enhanced drag attributes with better UX
            taskEl.draggable = true;
            taskEl.dataset.taskId = task._id;
            taskEl.dataset.originalDate = task.dueDate;
            taskEl.dataset.originalTime = task.dueTime || task.due_time || '';

            // Add drag event listeners
            taskEl.addEventListener('dragstart', handleCalendarTaskDragStart);
            taskEl.addEventListener('dragend', handleCalendarTaskDragEnd);

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
// Helper function to clear all Matrix containers (Task 4 from spec)
function clearMatrixContainers() {
    const containers = ['matrix-view-container', 'matrix-header', 'matrix-filter-bar'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            el.style.display = 'none';
            el.style.visibility = 'hidden';
        }
    });

    // Hide banner but don't clear it (it has user settings)
    const banner = document.getElementById('matrix-banner');
    if (banner) {
        banner.style.display = 'none';
        banner.style.visibility = 'hidden';
    }
}

// Comprehensive list of Matrix-specific CSS selectors for cleanup
const MATRIX_SELECTORS = [
    '.kanban-board', '.kanban-column', '.matrix-task-card', '.smart-list-view',
    '.list-task-card', '.dashboard-view', '.eisenhower-grid', '.matrix-view-container',
    '.matrix-banner', '.matrix-header', '.matrix-filter-bar', '.matrix-view-switcher',
    '.matrix-header-actions', '.matrix-btn', '.filter-bar', '.filter-chip',
    '.matrix-banner-default', '.banner-image-container', '.banner-actions',
    '.quadrant', '.quadrant-tasks', '.quadrant-header', '.kanban-column-tasks',
    '.kanban-column-header', '.filter-group', '.filter-chips', '.filter-label'
];

// Helper function to aggressively clean up matrix elements from wrong locations
function cleanupMatrixElements() {
    const matrixView = document.getElementById('matrix-view');
    const matrixBanner = document.getElementById('matrix-banner');
    const matrixHeader = document.getElementById('matrix-header');
    const matrixFilterBar = document.getElementById('matrix-filter-bar');
    const matrixContainer = document.getElementById('matrix-view-container');

    // CRITICAL: If matrix view is hidden, ensure ALL its elements are hidden and cleared
    if (matrixView && matrixView.classList.contains('hidden')) {
        // Clear all content containers with inline style fallback
        [matrixHeader, matrixFilterBar, matrixContainer].forEach(el => {
            if (el) {
                el.innerHTML = '';
                el.style.display = 'none';
                el.style.visibility = 'hidden';
            }
        });

        // Hide banner (but don't clear it - it has user settings)
        if (matrixBanner) {
            matrixBanner.style.display = 'none';
            matrixBanner.style.visibility = 'hidden';
        }

        // Force hide ALL children recursively
        const allChildren = matrixView.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.display = 'none';
            child.style.visibility = 'hidden';
        });
    }

    // CRITICAL: Remove matrix elements from ALL non-matrix views
    const allViews = document.querySelectorAll('.view:not(#matrix-view)');

    allViews.forEach(view => {
        if (!view) return;

        // Remove any matrix elements that shouldn't be here using comprehensive selector list
        const orphanedElements = view.querySelectorAll(MATRIX_SELECTORS.join(', '));
        orphanedElements.forEach(el => {
            // Only remove if it's not a core element by ID
            if (el.id !== 'matrix-banner' && el.id !== 'matrix-header' &&
                el.id !== 'matrix-filter-bar' && el.id !== 'matrix-view-container') {
                el.remove();
            }
        });
    });

    // CRITICAL: Verify Matrix elements are inside Matrix_View (containment check)
    // If they're outside, remove them - they will be recreated when needed
    if (matrixView) {
        [matrixBanner, matrixHeader, matrixFilterBar, matrixContainer].forEach(el => {
            if (el && el.parentElement && el.parentElement.id !== 'matrix-view') {
                // Element is outside matrix-view - remove it
                console.warn('[Matrix Cleanup] Removing orphaned element:', el.id);
                el.remove();
            }
        });
    }
}

function showView(view) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Save current view to localStorage for page reload persistence
    // Don't save settings view - always reload to previous view instead
    if (view !== 'settings') {
        localStorage.setItem('currentView', view);
    }
    state.currentView = view;

    // Clear tag-specific state when navigating to non-tag views
    if (view !== 'tag') {
        state.currentTag = null;
        localStorage.removeItem('currentTag');
    }

    // Also clear active state from tag items when switching views
    document.querySelectorAll('.tag-item.active').forEach(el => el.classList.remove('active'));

    // CRITICAL: Hide all views first to ensure isolation (with null checks)
    if (elements.tasksView) elements.tasksView.classList.add('hidden');
    if (elements.habitsView) elements.habitsView.classList.add('hidden');
    if (elements.calendarView) elements.calendarView.classList.add('hidden');
    if (elements.settingsView) elements.settingsView.classList.add('hidden');
    if (elements.pomodoroView) elements.pomodoroView.classList.add('hidden');
    if (elements.statsView) elements.statsView.classList.add('hidden');

    // CRITICAL: Hide matrix view and clear ALL its containers to prevent content bleeding
    const matrixView = document.getElementById('matrix-view');
    if (matrixView) {
        matrixView.classList.add('hidden');
        // Use helper to clear all matrix containers
        clearMatrixContainers();
    }

    // CRITICAL: Aggressively clean up any matrix elements from wrong locations
    cleanupMatrixElements();

    // CRITICAL: Clear tasks list container when switching away from tasks view
    // This prevents matrix content from appearing in tasks view
    if (view !== 'inbox' && view !== 'today' && view !== 'week' && view !== 'all' && view !== 'completed' && view !== 'wont-do' && view !== 'custom') {
        if (elements.tasksList) {
            elements.tasksList.innerHTML = '';
        }
    }

    state.currentView = view;

    switch (view) {
        case 'matrix':
            if (matrixView) {
                // CRITICAL: First ensure matrix view is properly isolated
                cleanupMatrixElements();

                // CRITICAL: Clear ALL matrix containers before showing to prevent content bleeding
                const matrixContainer = document.getElementById('matrix-view-container');
                const matrixHeader = document.getElementById('matrix-header');
                const matrixFilterBar = document.getElementById('matrix-filter-bar');
                const matrixBanner = document.getElementById('matrix-banner');

                if (matrixContainer) {
                    matrixContainer.innerHTML = '';
                    matrixContainer.style.display = '';
                    matrixContainer.style.visibility = '';
                }
                if (matrixHeader) {
                    matrixHeader.innerHTML = '';
                    matrixHeader.style.display = '';
                    matrixHeader.style.visibility = '';
                }
                if (matrixFilterBar) {
                    matrixFilterBar.innerHTML = '';
                    matrixFilterBar.style.display = '';
                    matrixFilterBar.style.visibility = '';
                }
                // Show banner when showing matrix view - reset all visibility
                if (matrixBanner) {
                    matrixBanner.style.display = '';
                    matrixBanner.style.visibility = '';

                    // Also reset child elements visibility
                    const imageContainer = matrixBanner.querySelector('.banner-image-container');
                    const bannerActions = matrixBanner.querySelector('.banner-actions');
                    const editBtn = document.getElementById('banner-edit-btn');

                    if (imageContainer) {
                        imageContainer.style.display = '';
                        imageContainer.style.visibility = '';
                    }
                    if (bannerActions) {
                        bannerActions.style.display = '';
                        bannerActions.style.visibility = '';
                    }
                    if (editBtn) {
                        editBtn.style.display = '';
                        editBtn.style.visibility = '';
                    }

                    // Load and display banner image if user has one
                    const bannerImage = document.getElementById('matrix-banner-image');
                    const bannerDefault = document.getElementById('matrix-banner-default');
                    const removeBtn = document.getElementById('banner-remove-btn');

                    // Refresh Lucide icons for banner buttons immediately
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    // Fetch user's banner preference from API with auth token
                    const token = localStorage.getItem('token');
                    fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                        .then(res => res.json())
                        .then(data => {
                            const user = data.user || data;
                            const bannerUrl = user.matrixBanner;
                            if (bannerUrl && bannerImage) {
                                // User has custom banner - show image, hide default
                                bannerImage.src = bannerUrl;
                                bannerImage.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
                                if (bannerDefault) bannerDefault.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
                                if (removeBtn) removeBtn.style.display = 'flex';
                            } else {
                                // No custom banner - show default gradient
                                if (bannerImage) {
                                    bannerImage.src = '';
                                    bannerImage.style.cssText = 'display: none !important;';
                                }
                                if (bannerDefault) {
                                    bannerDefault.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
                                }
                                if (removeBtn) removeBtn.style.display = 'none';
                            }
                            // Refresh icons after banner state is set
                            if (typeof lucide !== 'undefined') lucide.createIcons();
                        })
                        .catch(err => {
                            console.warn('Failed to load banner:', err);
                            // Fallback to default
                            if (bannerImage) {
                                bannerImage.src = '';
                                bannerImage.style.cssText = 'display: none !important;';
                            }
                            if (bannerDefault) {
                                bannerDefault.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
                            }
                            if (removeBtn) removeBtn.style.display = 'none';
                            // Still refresh icons on error
                            if (typeof lucide !== 'undefined') lucide.createIcons();
                        });
                }

                // Remove hidden class and ensure proper display
                matrixView.classList.remove('hidden');
                matrixView.style.display = '';
                matrixView.style.visibility = '';
                matrixView.style.position = '';
                matrixView.style.left = '';
                matrixView.style.top = '';
                matrixView.style.width = '';
                matrixView.style.height = '';
                matrixView.style.zIndex = '';
                matrixView.style.opacity = '';

                elements.currentViewTitle.textContent = 'Task Matrix';
                document.querySelector('[data-view="matrix"]')?.classList.add('active');
                // Initialize Task Matrix
                if (window.taskMatrix && typeof window.taskMatrix.init === 'function') {
                    window.taskMatrix.init();
                }
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            break;
        case 'habits':
            elements.habitsView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Habits';
            document.querySelector('[data-view="habits"]')?.classList.add('active');
            renderHabits();
            // Initialize Lucide icons for the habits view
            if (typeof lucide !== 'undefined') lucide.createIcons();
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
            if (window.statisticsModule) {
                window.statisticsModule.init();
            }
            break;
        case 'settings':
            elements.settingsView.classList.remove('hidden');
            elements.currentViewTitle.textContent = 'Settings';
            loadLLMConfig();
            loadGoogleCalendarStatus(); // Load Google Calendar status
            break;
        default:
            // CRITICAL: Clear tasks list container before showing to prevent content bleeding
            if (elements.tasksList) {
                elements.tasksList.innerHTML = '';
            }
            elements.tasksView.classList.remove('hidden');
            selectSmartList(view);
    }
}

function selectSmartList(listId) {
    // Clear ALL navigation active states
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tag-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-list="${listId}"]`)?.classList.add('active');

    state.currentView = listId;
    state.currentList = null;
    state.currentTag = null;  // Clear current tag

    const titles = {
        inbox: 'Inbox',
        today: 'Today',
        week: 'Next 7 Days',
        all: 'All Tasks',
        completed: 'Completed',
        'wont-do': "Won't Do"
    };

    elements.currentViewTitle.textContent = titles[listId] || listId;

    // CRITICAL: Ensure all other views are hidden and their containers cleared
    elements.habitsView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.settingsView.classList.add('hidden');
    elements.pomodoroView.classList.add('hidden');
    elements.statsView.classList.add('hidden');

    // CRITICAL: Clear matrix view and ALL its containers to prevent content bleeding
    const matrixView = document.getElementById('matrix-view');
    if (matrixView) {
        matrixView.classList.add('hidden');
        // Use helper to clear all matrix containers
        clearMatrixContainers();
    }

    // CRITICAL: Aggressively clean up any matrix elements from wrong locations
    cleanupMatrixElements();

    // CRITICAL: Clear tasks list container before rendering to ensure isolation
    if (elements.tasksList) {
        elements.tasksList.innerHTML = '';
    }

    elements.tasksView.classList.remove('hidden');

    renderTasks();
}

function selectCustomList(listId) {
    // Clear ALL navigation active states
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tag-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-custom-list="${listId}"]`)?.classList.add('active');

    state.currentView = 'custom';
    state.currentList = listId;
    state.currentTag = null;  // Clear current tag

    const list = state.lists.find(l => l._id === listId || l.id === listId);
    elements.currentViewTitle.textContent = list?.name || 'List';

    // CRITICAL: Ensure all other views are hidden and their containers cleared
    elements.habitsView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.settingsView.classList.add('hidden');
    elements.pomodoroView.classList.add('hidden');
    elements.statsView.classList.add('hidden');

    // CRITICAL: Clear matrix view and ALL its containers to prevent content bleeding
    const matrixView = document.getElementById('matrix-view');
    if (matrixView) {
        matrixView.classList.add('hidden');
        // Use helper to clear all matrix containers
        clearMatrixContainers();
    }

    // CRITICAL: Aggressively clean up any matrix elements from wrong locations
    cleanupMatrixElements();

    // CRITICAL: Clear tasks list container before rendering to ensure isolation
    if (elements.tasksList) {
        elements.tasksList.innerHTML = '';
    }

    elements.tasksView.classList.remove('hidden');

    renderTasks();
}

// Tasks
function renderTasks() {
    // CRITICAL: Aggressively clean up any matrix elements from wrong locations FIRST
    cleanupMatrixElements();

    // CRITICAL: Validate and clear tasks list container to ensure isolation
    if (!elements.tasksList || elements.tasksList.id !== 'tasks-list') {
        console.warn('[Tasks] Invalid tasks list container');
        return;
    }

    // CRITICAL: Clear container completely before rendering to prevent content bleeding
    elements.tasksList.innerHTML = '';

    let tasks = [...state.tasks];
    const today = getTodayAtMidnight();
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
                const due = parseDateString(t.dueDate);
                return due && due.getTime() === today.getTime();
            });
            break;
        case 'week':
            tasks = tasks.filter(t => {
                if (t.completed) return false;
                if (!t.dueDate) return false;
                const due = parseDateString(t.dueDate);
                return due && due >= today && due < weekEnd;
            });
            break;
        case 'all':
            tasks = tasks.filter(t => !t.completed);
            break;
        case 'completed':
            tasks = tasks.filter(t => t.completed);
            break;
        case 'wont-do':
            tasks = tasks.filter(t => t.status === 'skipped');
            break;
        case 'custom':
            tasks = tasks.filter(t => t.list_id === state.currentList);
            break;
        case 'tag':
            // Filter tasks by the selected tag
            if (state.currentTag) {
                tasks = tasks.filter(t => {
                    if (!t.tags || !Array.isArray(t.tags)) return false;
                    // Check if any of the task's tags match or start with the selected tag path
                    return t.tags.some(tag =>
                        tag === state.currentTag || tag.startsWith(state.currentTag + ':')
                    );
                });
            }
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
        if (a.dueDate && b.dueDate) {
            const dateA = parseDateString(a.dueDate);
            const dateB = parseDateString(b.dueDate);
            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1;
            if (dateB) return 1;
            return 0;
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    // Double-check container is still valid and clear
    if (!elements.tasksList || elements.tasksList.id !== 'tasks-list') {
        console.warn('[Tasks] Container invalidated during render');
        return;
    }
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

// Get status icon based on status and theme
// Updated for ADHD-friendly visual feedback (Requirements 1.1-1.4)
function getStatusIcon(status, theme = 'light', animated = false) {
    // For in-progress status, optionally return animated SVG spinner
    if (status === 'in_progress' && animated) {
        return `<svg class="status-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" opacity="0.25"/>
                    <path d="M12 2 A10 10 0 0 1 22 12" stroke-linecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </path>
                </svg>`;
    }

    const icons = {
        'scheduled': '📅',      // Scheduled - calendar emoji (unchanged)
        'in_progress': '⏳',    // In Progress - hourglass/loading indicator
        'completed': '✅',      // Complete - check mark for positive reinforcement
        'skipped': '❌'         // Skipped - cross/false emoji for clear negative feedback
    };
    return icons[status] || icons['scheduled'];
}

// Get event card styles based on event and theme
function getEventCardStyles(event, theme) {
    const isShort = event.duration && event.duration < 30; // minutes
    const currentTheme = theme || document.documentElement.dataset.theme || 'light';
    const isDark = currentTheme.includes('dark') || currentTheme === 'dark';

    if (event.googleCalendarColor) {
        // Keep Google Calendar colors but add theme-aware opacity
        return `background: ${event.googleCalendarColor};`;
    }

    if (isDark) {
        return `background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%); border-left: 3px solid var(--accent-primary);`;
    } else {
        return `background: linear-gradient(135deg, #F2F2F7 0%, #FFFFFF 100%); border-left: 3px solid var(--accent-primary);`;
    }
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

    // Status badge with ADHD-friendly emojis and ARIA labels (Requirements 1.1-1.6)
    const statusConfig = {
        'scheduled': { icon: '📅', label: 'Scheduled', class: 'scheduled', ariaLabel: 'Task is scheduled' },
        'in_progress': { icon: '⏳', label: 'In Progress', class: 'in-progress', ariaLabel: 'Task is in progress' },
        'completed': { icon: '✅', label: 'Completed', class: 'completed', ariaLabel: 'Task is completed' },
        'skipped': { icon: '❌', label: 'Skipped', class: 'skipped', ariaLabel: 'Task was skipped' }
    };
    const statusInfo = statusConfig[status] || statusConfig['scheduled'];
    // Hide badge for completed and skipped (won't do) tasks
    const statusBadgeHTML = (status === 'completed' || status === 'skipped') ? '' : `<span class="task-status-badge ${statusInfo.class}" 
                                   title="${statusInfo.label}" 
                                   aria-label="${statusInfo.ariaLabel}" 
                                   role="status">${statusInfo.icon}</span>`;

    div.innerHTML = `
        <div class="task-checkbox ${status === 'completed' ? 'checked' : ''}" title="Mark as completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <div class="task-content">
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
            ${state.currentView === 'wont-do' ? `
                <button class="btn-icon restore-btn" data-action="restore" data-task-id="${task._id || task.id}" title="Restore to Scheduled">↩️</button>
                <button class="btn-icon delete-btn" data-action="delete" data-task-id="${task._id || task.id}" title="Permanently Delete">🗑️</button>
            ` : `
                <button class="btn-icon status-btn" data-action="cycle" data-task-id="${task._id || task.id}" title="Change status">
                    ${status === 'scheduled' ? '▶️' : status === 'in_progress' ? '⏸️' : status === 'completed' ? '↩️' : '↩️'}
                </button>
                <button class="btn-icon" data-action="delete" data-task-id="${task._id || task.id}" title="Delete">🗑️</button>
            `}
        </div>
    `;

    // Add event listeners instead of inline handlers for better reliability with draggable elements
    const checkbox = div.querySelector('.task-checkbox');
    const content = div.querySelector('.task-content');
    const buttons = div.querySelectorAll('.btn-icon');
    
    if (checkbox) {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            completeTask(task._id || task.id, e);
        });
    }
    
    if (content) {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            openTaskModal(task._id || task.id);
        });
    }
    
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const action = btn.dataset.action;
            const taskId = btn.dataset.taskId;
            if (action === 'restore') restoreTask(taskId, e);
            else if (action === 'delete') deleteTask(taskId, e);
            else if (action === 'cycle') cycleTaskStatus(taskId, e);
        });
    });

    return div;
}

function formatDueDate(dateStr) {
    // Parse date string without timezone conversion
    const taskDate = parseDateString(dateStr);
    if (!taskDate) return '';
    
    const today = getTodayAtMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let className = 'task-due';
    let label = '';

    if (taskDate < today) {
        className += ' overdue';
        label = 'Overdue';
    } else if (taskDate.getTime() === today.getTime()) {
        className += ' today';
        label = 'Today';
    } else if (taskDate.getTime() === tomorrow.getTime()) {
        label = 'Tomorrow';
    } else {
        label = taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Time is stored separately, no need to display it from date
    return `<span class="${className}">📅 ${label}</span>`;
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

        // Cross-view synchronization (Requirements 1.6)
        updateAllViews();

        showToast(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
    } catch (error) {
        console.error('Complete task error:', error);
        showToast('Failed to update task', 'error');
    }
}

// Cycle through status: scheduled -> in_progress -> completed -> skipped -> scheduled
async function cycleTaskStatus(id, e) {
    e.stopPropagation();
    const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === id);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    const statusCycle = ['scheduled', 'in_progress', 'completed', 'skipped'];
    const currentIndex = statusCycle.indexOf(task.status || 'scheduled');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    const statusLabels = {
        'scheduled': 'Scheduled',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'skipped': 'Skipped'
    };

    try {
        const updatedTask = await api.updateTask(id, { status: nextStatus });
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };

        // Cross-view synchronization (Requirements 1.6)
        updateAllViews();

        showToast(`Task: ${statusLabels[nextStatus]}`);
    } catch (error) {
        console.error('Cycle task status error:', error);
        showToast('Failed to update task', 'error');
    }
}

// Cross-view synchronization helper function
function updateAllViews() {
    renderTasks();
    renderCalendar();
    updateCounts();

    // Update any other views that might be showing tasks
    if (state.currentView === 'habits') {
        renderHabits();
    }

    // Update stats if stats view is active
    if (state.currentView === 'stats' && window.statsModule) {
        window.statsModule.refresh();
    }
}

async function restoreTask(id, e) {
    e.stopPropagation();
    try {
        const updatedTask = await api.updateTask(id, { status: 'scheduled' });
        const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === id);
        if (taskIndex !== -1) {
            state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };
        }

        // Cross-view synchronization (Requirements 1.6)
        updateAllViews();

        showToast('Task restored to Scheduled');
    } catch (error) {
        console.error('Restore task error:', error);
        showToast('Failed to restore task', 'error');
    }
}

async function deleteTask(id, e) {
    e.stopPropagation();
    const isPermanent = state.currentView === 'wont-do';
    if (!confirm(isPermanent ? 'Permanently delete this task? This cannot be undone.' : 'Delete this task?')) return;

    try {
        await api.deleteTask(id);
        state.tasks = state.tasks.filter(t => (t._id || t.id) !== id);
        renderTasks();
        updateCounts();
        showToast(isPermanent ? 'Task permanently deleted' : 'Task deleted');
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

    // Create modal with correct structure (overlay and content as siblings)
    modal = document.createElement('div');
    modal.id = 'day-agenda-modal';
    modal.className = 'modal';

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
        <div class="modal-overlay" onclick="document.getElementById('day-agenda-modal').remove()"></div>
        <div class="day-agenda-content">
            <div class="day-agenda-header">
                <h2>${dateStr}</h2>
                <span class="task-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
                <button class="close-btn" onclick="document.getElementById('day-agenda-modal').remove()">×</button>
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
                            <div class="agenda-status ${task.status === 'completed' ? 'completed' : ''}">${getStatusIcon(task.status || 'scheduled')}</div>
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
                // Parse the date string directly without timezone conversion
                // Backend sends date as ISO string (e.g., "2026-01-22")
                // Extract just the date part if it includes time (YYYY-MM-DDTHH:MM:SS)
                let dateStr = task.due_date;
                if (typeof dateStr === 'string' && dateStr.includes('T')) {
                    dateStr = dateStr.split('T')[0];
                }
                document.getElementById('task-due-date').value = dateStr;
                
                // Handle time separately if available  
                if (task.due_time) {
                    document.getElementById('task-due-time').value = task.due_time;
                } else {
                    document.getElementById('task-due-time').value = '';
                }
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

            // Load reminder settings
            const reminder = task.reminder || {};
            const reminderEnabled = document.getElementById('task-reminder-enabled');
            const reminderConfig = document.getElementById('reminder-config');
            if (reminderEnabled) {
                reminderEnabled.checked = reminder.enabled || false;
                if (reminderConfig) {
                    reminderConfig.style.display = reminder.enabled ? 'block' : 'none';
                }
            }
            const reminderMinutes = document.getElementById('task-reminder-minutes');
            if (reminderMinutes) reminderMinutes.value = reminder.minutesBefore || 30;
            const reminderDesktop = document.getElementById('task-reminder-desktop');
            if (reminderDesktop) reminderDesktop.checked = reminder.notifyDesktop !== false;
            const reminderMobile = document.getElementById('task-reminder-mobile');
            if (reminderMobile) reminderMobile.checked = reminder.notifyMobile !== false;

            // Load sync-to-calendar setting
            const syncCalendar = document.getElementById('task-sync-calendar');
            if (syncCalendar) {
                syncCalendar.checked = task.syncToCalendar || task.syncedWithGoogle || false;
            }
        }
    } else {
        title.textContent = 'New Task';
        document.getElementById('task-status').value = 'scheduled';
        if (state.currentList) {
            document.getElementById('task-list').value = state.currentList;
        }

        // Reset reminder and sync settings for new task
        const reminderEnabled = document.getElementById('task-reminder-enabled');
        const reminderConfig = document.getElementById('reminder-config');
        if (reminderEnabled) {
            reminderEnabled.checked = false;
            if (reminderConfig) reminderConfig.style.display = 'none';
        }
        const reminderMinutes = document.getElementById('task-reminder-minutes');
        if (reminderMinutes) reminderMinutes.value = '30';
        const reminderDesktop = document.getElementById('task-reminder-desktop');
        if (reminderDesktop) reminderDesktop.checked = true;
        const reminderMobile = document.getElementById('task-reminder-mobile');
        if (reminderMobile) reminderMobile.checked = true;
        const syncCalendar = document.getElementById('task-sync-calendar');
        if (syncCalendar) {
            // Default to checked if user has Google Calendar connected
            syncCalendar.checked = state.calendarConnected || false;
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
    const dueTime = document.getElementById('task-due-time').value;
    if (dueDate) {
        // Send date and time separately WITHOUT timezone conversion
        // This preserves the exact date and time the user selected
        taskData.due_date = dueDate;  // Just the date string YYYY-MM-DD
        taskData.due_time = dueTime || null;  // Just the time string HH:MM or null
    }

    // Add reminder configuration
    const reminderEnabled = document.getElementById('task-reminder-enabled');
    if (reminderEnabled) {
        taskData.reminder = {
            enabled: reminderEnabled.checked,
            minutesBefore: parseInt(document.getElementById('task-reminder-minutes')?.value || '30'),
            notifyDesktop: document.getElementById('task-reminder-desktop')?.checked !== false,
            notifyMobile: document.getElementById('task-reminder-mobile')?.checked !== false
        };
    }

    // Add sync-to-calendar setting
    const syncCalendar = document.getElementById('task-sync-calendar');
    if (syncCalendar) {
        taskData.syncToCalendar = syncCalendar.checked;
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
        console.error('[Task Submit] Error:', error);
        showToast('Failed to save task: ' + (error.message || error), 'error');
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
        li.draggable = true;

        // Use Lucide icon element (custom icon overrides default)
        const iconName = item.customIcon || item.icon;
        li.innerHTML = `
            <span class="nav-icon"><i data-lucide="${iconName}"></i></span>
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

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
        li.draggable = true;

        // Use Lucide icon element (custom icon overrides default)
        const iconName = item.customIcon || item.icon;
        li.innerHTML = `
            <span class="nav-icon"><i data-lucide="${iconName}"></i></span>
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

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Render Task Status section (Completed, Won't Do)
function renderTaskStatus() {
    const taskStatusListEl = document.getElementById('task-status-list');
    if (!taskStatusListEl) return;

    taskStatusListEl.innerHTML = '';

    taskStatusItems.forEach(item => {
        const li = document.createElement('li');
        li.className = `nav-item${state.currentList === item.id ? ' active' : ''}`;
        li.dataset.list = item.id;
        li.dataset.itemType = 'task-status';

        // Use Lucide icon element
        li.innerHTML = `
            <span class="nav-icon"><i data-lucide="${item.icon}"></i></span>
            <span class="nav-label">${escapeHTML(item.label)}</span>
            <span class="nav-count" id="${item.countId}">0</span>
        `;

        li.onclick = () => selectSmartList(item.id);
        taskStatusListEl.appendChild(li);
    });

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

// Duplicate a sidebar item (creates a copy with new ID)
function duplicateSidebarItem(itemType, itemId) {
    const config = getSidebarConfig();

    if (itemType === 'smart-list') {
        const original = config.smartLists.find(i => i.id === itemId);
        if (original) {
            const newItem = {
                ...original,
                id: `${original.id}_copy_${Date.now()}`,
                customLabel: (original.customLabel || original.label) + ' (Copy)',
                visible: true
            };
            config.smartLists.push(newItem);
            showToast(`Duplicated "${original.customLabel || original.label}"`, 'success');
        }
    } else if (itemType === 'tool') {
        const original = config.tools.find(i => i.id === itemId);
        if (original) {
            const newItem = {
                ...original,
                id: `${original.id}_copy_${Date.now()}`,
                customLabel: (original.customLabel || original.label) + ' (Copy)',
                visible: true
            };
            config.tools.push(newItem);
            showToast(`Duplicated "${original.customLabel || original.label}"`, 'success');
        }
    } else if (itemType === 'custom-list') {
        // For custom lists, duplicate via API
        const original = state.lists.find(l => (l._id || l.id) === itemId);
        if (original) {
            api.createList({ name: original.name + ' (Copy)', color: original.color })
                .then(() => loadData())
                .then(() => showToast(`Duplicated "${original.name}"`, 'success'))
                .catch(() => showToast('Failed to duplicate list', 'error'));
            return;
        }
    }

    saveSidebarConfig(config);
    renderSmartLists();
    renderTools();
}

// ============================================
// SIDEBAR DRAG & DROP REORDERING
// ============================================

let draggedSidebarItem = null;

function initSidebarDragDrop() {
    const smartListsEl = document.getElementById('smart-lists');
    const toolsListEl = document.getElementById('tools-list');
    const customListsEl = document.getElementById('custom-lists');

    [smartListsEl, toolsListEl, customListsEl].forEach(container => {
        if (!container) return;

        container.addEventListener('dragstart', handleSidebarDragStart);
        container.addEventListener('dragover', handleSidebarDragOver);
        container.addEventListener('drop', handleSidebarDrop);
        container.addEventListener('dragend', handleSidebarDragEnd);
    });
}

function handleSidebarDragStart(e) {
    if (!e.target.classList.contains('nav-item')) return;

    draggedSidebarItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.list || e.target.dataset.view || e.target.dataset.customList);
}

function handleSidebarDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    const dragging = document.querySelector('.nav-item.dragging');

    // Remove drag-over class from all items
    e.currentTarget.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('drag-over');
    });

    if (dragging && afterElement === null) {
        e.currentTarget.appendChild(dragging);
    } else if (dragging && afterElement) {
        e.currentTarget.insertBefore(dragging, afterElement);
        // Add visual indicator to the element we're inserting before
        afterElement.classList.add('drag-over');
    }
}

function handleSidebarDrop(e) {
    e.preventDefault();

    // Remove all drag-over indicators
    document.querySelectorAll('.nav-item.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });

    // Save the new order
    const container = e.currentTarget;
    const items = Array.from(container.querySelectorAll('.nav-item'));
    const config = getSidebarConfig();

    if (container.id === 'smart-lists') {
        const newOrder = items.map(item => item.dataset.list).filter(Boolean);
        const reordered = [];
        newOrder.forEach(id => {
            const found = config.smartLists.find(i => i.id === id);
            if (found) reordered.push(found);
        });
        // Add any items not in DOM (hidden ones)
        config.smartLists.forEach(i => {
            if (!reordered.find(r => r.id === i.id)) reordered.push(i);
        });
        config.smartLists = reordered;
    } else if (container.id === 'tools-list') {
        const newOrder = items.map(item => item.dataset.view).filter(Boolean);
        const reordered = [];
        newOrder.forEach(view => {
            const found = config.tools.find(i => i.view === view);
            if (found) reordered.push(found);
        });
        config.tools.forEach(i => {
            if (!reordered.find(r => r.id === i.id)) reordered.push(i);
        });
        config.tools = reordered;
    } else if (container.id === 'custom-lists') {
        // Custom lists are stored in state.lists, reorder based on DOM order
        const newOrder = items.map(item => item.dataset.customList || item.dataset.listId).filter(Boolean);
        // Custom lists order is visual only - the backend doesn't support ordering
        // Just ensure the DOM reflects the user's preference
        console.log('Custom lists reordered:', newOrder);
    }

    saveSidebarConfig(config);
}

function handleSidebarDragEnd(e) {
    if (draggedSidebarItem) {
        draggedSidebarItem.classList.remove('dragging');
        draggedSidebarItem = null;
    }

    // Remove all drag-over indicators
    document.querySelectorAll('.nav-item.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });

    // Remove any leftover drag styling
    document.querySelectorAll('.nav-item.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.nav-item:not(.dragging)')];

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

// ============================================
// SIDEBAR RESIZE FUNCTIONALITY
// ============================================

const sidebarResizeState = {
    isResizing: false,
    startX: 0,
    startWidth: 0,
    minWidth: 200,
    maxWidth: 400
};

function initSidebarResize() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sidebar-resize-handle';
    sidebar.appendChild(resizeHandle);

    // Load saved width
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= sidebarResizeState.minWidth && width <= sidebarResizeState.maxWidth) {
            setSidebarWidth(width);
        }
    }

    // Event listeners
    resizeHandle.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeStart(e) {
    e.preventDefault();
    sidebarResizeState.isResizing = true;
    sidebarResizeState.startX = e.clientX;
    const sidebar = document.querySelector('.sidebar');
    sidebarResizeState.startWidth = sidebar.offsetWidth;

    document.body.classList.add('sidebar-resizing');
    document.querySelector('.sidebar-resize-handle')?.classList.add('resizing');
}

function handleResizeMove(e) {
    if (!sidebarResizeState.isResizing) return;

    const deltaX = e.clientX - sidebarResizeState.startX;
    let newWidth = sidebarResizeState.startWidth + deltaX;

    // Clamp to bounds
    newWidth = Math.max(sidebarResizeState.minWidth, Math.min(sidebarResizeState.maxWidth, newWidth));

    setSidebarWidth(newWidth);
}

function handleResizeEnd() {
    if (!sidebarResizeState.isResizing) return;

    sidebarResizeState.isResizing = false;
    document.body.classList.remove('sidebar-resizing');
    document.querySelector('.sidebar-resize-handle')?.classList.remove('resizing');

    // Save width to localStorage
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        localStorage.setItem('sidebarWidth', sidebar.offsetWidth.toString());
    }
}

function setSidebarWidth(width) {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar) {
        sidebar.style.width = `${width}px`;
    }
    if (mainContent) {
        mainContent.style.marginLeft = `${width}px`;
    }

    // Update CSS variable for consistency
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
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
    } else if (section === 'task-status') {
        title.textContent = 'Manage Status Items';
        // Get current visibility state from config or default to visible
        const statusConfig = config.taskStatus || taskStatusItems.map(s => ({ ...s, visible: true }));
        items = taskStatusItems.map(def => {
            const current = statusConfig.find(i => i.id === def.id);
            return {
                ...def,
                visible: current ? current.visible : true
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
    } else if (section === 'task-status') {
        // Initialize taskStatus config if not present
        if (!config.taskStatus) {
            config.taskStatus = taskStatusItems.map(s => ({ ...s, visible: true }));
        }
        const item = config.taskStatus.find(i => i.id === itemId);
        if (item) item.visible = true;
    }

    saveSidebarConfig(config);
    closeAddSidebarModal();
    renderSmartLists();
    renderTools();
    renderTaskStatus();
    showToast('Item added!', 'success');
}

function openRenameModal(itemType, itemId) {
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-input');
    const iconInput = document.getElementById('rename-icon');
    const iconPreview = document.getElementById('icon-preview');
    const itemIdField = document.getElementById('rename-item-id');
    const itemTypeField = document.getElementById('rename-item-type');

    if (!modal || !input || !itemIdField || !itemTypeField) return;

    const config = getSidebarConfig();
    let item;
    let currentIcon = 'circle';

    // Get or create color picker group
    let colorGroup = document.querySelector('#rename-modal .color-picker-group');
    const iconGroup = document.querySelector('#rename-modal .icon-picker-group');

    if (itemType === 'smart-list') {
        item = config.smartLists.find(i => i.id === itemId);
        if (item) currentIcon = item.customIcon || item.icon;
        if (colorGroup) colorGroup.style.display = 'none';
        if (iconGroup) iconGroup.style.display = '';
    } else if (itemType === 'tool') {
        item = config.tools.find(i => i.id === itemId);
        if (item) currentIcon = item.customIcon || item.icon;
        if (colorGroup) colorGroup.style.display = 'none';
        if (iconGroup) iconGroup.style.display = '';
    } else if (itemType === 'tag') {
        item = state.tags.find(t => t._id === itemId);
        if (item) {
            input.value = item.name;
            itemIdField.value = itemId;
            itemTypeField.value = itemType;
            // Hide icon picker for tags (they use # symbol)
            if (iconGroup) iconGroup.style.display = 'none';

            // Show or create color picker for tags
            if (!colorGroup) {
                // Create color picker group if it doesn't exist
                const formGroups = modal.querySelector('.modal-body') || modal.querySelector('.modal-content');
                if (formGroups) {
                    const colorHtml = `
                        <div class="form-group color-picker-group">
                            <label for="rename-color">Color</label>
                            <input type="color" id="rename-color" value="${item.color || '#8B5CF6'}">
                        </div>
                    `;
                    const existingColorGroup = document.getElementById('rename-color');
                    if (!existingColorGroup) {
                        input.closest('.form-group').insertAdjacentHTML('afterend', colorHtml);
                    }
                }
                colorGroup = document.querySelector('#rename-modal .color-picker-group');
            }

            if (colorGroup) {
                colorGroup.style.display = '';
                const colorInput = document.getElementById('rename-color');
                if (colorInput) colorInput.value = item.color || '#8B5CF6';
            }

            modal.classList.remove('hidden');
            input.focus();
            input.select();
            return;
        }
    } else if (itemType === 'custom-list') {
        item = state.lists.find(l => (l._id || l.id) === itemId);
        if (item) {
            input.value = item.name;
            itemIdField.value = itemId;
            itemTypeField.value = itemType;
            currentIcon = item.icon || 'list';
        }
        if (colorGroup) colorGroup.style.display = 'none';
        if (iconGroup) iconGroup.style.display = '';
    }

    if (!item) return;

    if (itemType === 'smart-list' || itemType === 'tool') {
        input.value = item.customLabel || item.label;
    }

    itemIdField.value = itemId;
    itemTypeField.value = itemType;

    // Show icon picker for non-tag items
    if (iconGroup) iconGroup.style.display = '';

    // Set current icon
    if (iconInput) iconInput.value = currentIcon;
    if (iconPreview) {
        iconPreview.innerHTML = `<i data-lucide="${currentIcon}"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Setup icon button click handlers
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.icon === currentIcon) btn.classList.add('active');
        btn.onclick = () => {
            const icon = btn.dataset.icon;
            if (iconInput) iconInput.value = icon;
            if (iconPreview) {
                iconPreview.innerHTML = `<i data-lucide="${icon}"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    // Setup icon input change handler
    if (iconInput) {
        iconInput.oninput = () => {
            const icon = iconInput.value.trim() || 'circle';
            if (iconPreview) {
                iconPreview.innerHTML = `<i data-lucide="${icon}"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        };
    }

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    const iconInput = document.getElementById('rename-icon');
    const colorInput = document.getElementById('rename-color');
    const itemId = document.getElementById('rename-item-id').value;
    const itemType = document.getElementById('rename-item-type').value;

    if (!input.value.trim()) return;

    const config = getSidebarConfig();
    let item;

    if (itemType === 'smart-list') {
        item = config.smartLists.find(i => i.id === itemId);
        if (item) {
            item.customLabel = input.value.trim();
            if (iconInput && iconInput.value.trim()) {
                item.customIcon = iconInput.value.trim();
            }
            saveSidebarConfig(config);
            renderSmartLists();
            renderTools();
            showToast('Updated successfully!', 'success');
        }
    } else if (itemType === 'tool') {
        item = config.tools.find(i => i.id === itemId);
        if (item) {
            item.customLabel = input.value.trim();
            if (iconInput && iconInput.value.trim()) {
                item.customIcon = iconInput.value.trim();
            }
            saveSidebarConfig(config);
            renderSmartLists();
            renderTools();
            showToast('Updated successfully!', 'success');
        }
    } else if (itemType === 'tag') {
        // Update tag via API with name and color
        const newName = input.value.trim();
        const newColor = colorInput ? colorInput.value : null;
        const updateData = { name: newName };
        if (newColor) updateData.color = newColor;

        api.updateTag(itemId, updateData)
            .then(() => {
                // Reload tags
                return api.getTags();
            })
            .then(tags => {
                state.tags = tags;
                renderTags();
                showToast('Tag updated successfully!', 'success');
            })
            .catch(err => {
                console.error('Failed to update tag:', err);
                showToast('Failed to update tag', 'error');
            });
    } else if (itemType === 'custom-list') {
        // Update custom list via API
        const newName = input.value.trim();
        const newIcon = iconInput ? iconInput.value.trim() : null;
        const updateData = { name: newName };
        if (newIcon) updateData.icon = newIcon;

        api.updateList(itemId, updateData)
            .then(() => {
                return loadData();
            })
            .then(() => {
                showToast('List renamed successfully!', 'success');
            })
            .catch(err => {
                console.error('Failed to rename list:', err);
                showToast('Failed to rename list', 'error');
            });
    }

    closeRenameModal();
}

// Lists
function renderLists() {
    if (!elements.customLists) return; // Guard against missing element
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
        // Initialize Lucide icons for the add button
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    state.habits.forEach(habit => {
        const card = createHabitCard(habit);
        elements.habitsList.appendChild(card);
    });

    // Initialize Lucide icons after rendering
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
            const statusIcon = getStatusIcon(taskStatus);
            return `<div class="calendar-task status-${taskStatus}" data-task-id="${t._id || t.id}" draggable="true" onclick="toggleCalendarTask('${t._id || t.id}', event)">
                        <span class="cal-task-status">${statusIcon}</span>
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

        // Filter tasks for this hour
        const hourTasks = dayTasks.filter(t => {
            // Priority 1: Use dueTime field (Google Calendar events)
            if (t.dueTime || t.due_time) {
                const timeStr = t.dueTime || t.due_time;
                const [taskH] = timeStr.split(':').map(Number);
                if (!isNaN(taskH)) return taskH === h;
            }

            // Priority 2: Extract from dueDate 
            const dueDate = t.dueDate || t.due_date;
            if (!dueDate) return h === 9; // Default to 9 AM if no date

            const d = new Date(dueDate);
            const taskHour = d.getHours();
            const taskMins = d.getMinutes();

            // If midnight with no dueTime, default to 9 AM
            if (taskHour === 0 && taskMins === 0) return h === 9;

            return taskHour === h;
        });

        hours.push(`
            <div class="day-hour-slot" data-hour="${h}">
                <div class="hour-label">${hourLabel}</div>
                <div class="hour-tasks">
                    ${hourTasks.map(t => {
            // Get display time from dueTime field or extract from dueDate
            let timeDisplay = '';
            if (t.dueTime || t.due_time) {
                timeDisplay = formatTimeDisplay(t.dueTime || t.due_time);
            } else {
                const dueDate = t.dueDate || t.due_date;
                if (dueDate) {
                    const d = new Date(dueDate);
                    const hours = d.getHours();
                    const mins = d.getMinutes();
                    if (hours !== 0 || mins !== 0) {
                        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                        timeDisplay = formatTimeDisplay(timeStr);
                    }
                }
            }
            const statusIcon = getStatusIcon(t.status || 'scheduled');
            const duration = t.googleEventId ? 60 : 30;

            // Get enhanced styling with theme integration
            const styleConfig = getEnhancedEventCardStyles({
                ...t,
                duration,
                googleCalendarColor: t.googleCalendarColor
            }, document.documentElement.dataset.theme, 'day');

            // Apply unified CSS classes for theme colors
            const cssClasses = [
                'calendar-task',
                styleConfig.classes
            ].filter(Boolean).join(' ');

            const inlineStyle = styleConfig.style; // Only Google Calendar colors

            return `
                        <div class="${cssClasses}" 
                             data-task-id="${t._id || t.id}" 
                             data-task-title="${escapeHTML(t.title)}"
                             data-task-description="${escapeHTML(t.description || '')}"
                             data-task-time="${timeDisplay}"
                             ${inlineStyle ? `style="${inlineStyle}"` : ''}
                             onclick="openTaskModal('${t._id || t.id}')">
                            ${timeDisplay ? `<span class="cal-task-time">${timeDisplay}</span>` : ''}
                            <span class="cal-task-status">${statusIcon}</span>
                            <span class="cal-task-title">${escapeHTML(t.title)}</span>
                        </div>
                    `;
        }).join('')}
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
    setTimeout(() => {
        attachEventTooltips();
        initDayViewDragDrop();
    }, 100);
}

// Format time from "HH:MM" (24hr) to "H:MM AM/PM" (12hr) for display
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
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
            // dueTime is stored as LOCAL time "HH:MM" in the backend (already converted from UTC)
            // dueDate is stored as midnight (no time component)
            let startMinutes = 9 * 60; // Default 9 AM
            let dueTime = null;

            // Priority 1: Use dueTime field if available (already in local time)
            if (t.dueTime || t.due_time) {
                const timeStr = t.dueTime || t.due_time;
                // Parse HH:MM format directly
                if (timeStr && timeStr.match(/^\d{1,2}:\d{2}$/)) {
                    const [h, m] = timeStr.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m)) {
                        startMinutes = h * 60 + m;
                        dueTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    }
                }
            }
            // Priority 2: Extract from dueDate if it has time component (non-Google events)
            else if (t.dueDate) {
                const d = new Date(t.dueDate);
                if (!isNaN(d.getTime())) {
                    const hours = d.getHours();
                    const mins = d.getMinutes();
                    // Only use time if it's not exactly midnight
                    if (hours !== 0 || mins !== 0) {
                        startMinutes = hours * 60 + mins;
                        dueTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                    }
                }
            }

            // Duration: 1 hour by default for events, 30min for tasks
            const duration = t.googleEventId ? 60 : 30;
            return {
                ...t,
                startMinutes,
                endMinutes: startMinutes + duration,
                displayTime: dueTime
            };
        }).sort((a, b) => a.startMinutes - b.startMinutes);

        // Simple column assignment for non-overlapping events
        // If events don't overlap, they each take full width
        // If events overlap, they share the column space

        if (processedTasks.length === 0) {
            // No tasks - continue to next day
        } else if (processedTasks.length === 1) {
            // Single task takes full width
            processedTasks[0].column = 0;
            processedTasks[0].totalColumns = 1;
        } else {
            // Multiple tasks - check for overlaps
            // Step 1: Build overlap groups
            const groups = [];
            const taskToGroup = new Map();

            processedTasks.forEach((task, i) => {
                // Find all tasks this overlaps with
                let foundGroup = null;

                for (const group of groups) {
                    for (const existingTask of group) {
                        // Check overlap: task.start < existing.end AND task.end > existing.start
                        if (task.startMinutes < existingTask.endMinutes &&
                            task.endMinutes > existingTask.startMinutes) {
                            foundGroup = group;
                            break;
                        }
                    }
                    if (foundGroup) break;
                }

                if (foundGroup) {
                    foundGroup.push(task);
                    taskToGroup.set(task, foundGroup);
                } else {
                    const newGroup = [task];
                    groups.push(newGroup);
                    taskToGroup.set(task, newGroup);
                }
            });

            // Step 2: Merge overlapping groups (transitive closure)
            let merged = true;
            while (merged) {
                merged = false;
                for (let i = 0; i < groups.length; i++) {
                    for (let j = i + 1; j < groups.length; j++) {
                        // Check if any task in group i overlaps with any in group j
                        let shouldMerge = false;
                        for (const taskI of groups[i]) {
                            for (const taskJ of groups[j]) {
                                if (taskI.startMinutes < taskJ.endMinutes &&
                                    taskI.endMinutes > taskJ.startMinutes) {
                                    shouldMerge = true;
                                    break;
                                }
                            }
                            if (shouldMerge) break;
                        }
                        if (shouldMerge) {
                            // Merge group j into group i
                            groups[i].push(...groups[j]);
                            groups.splice(j, 1);
                            merged = true;
                            break;
                        }
                    }
                    if (merged) break;
                }
            }

            // Step 3: For each group, assign columns using greedy algorithm
            groups.forEach(group => {
                // Sort by start time
                group.sort((a, b) => a.startMinutes - b.startMinutes);

                const columns = [];
                group.forEach(task => {
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

                // All tasks in this group share the same totalColumns
                const totalCols = columns.length;
                group.forEach(task => {
                    task.totalColumns = totalCols;
                });
            });
        }

        // Build day column HTML
        bodyHtml += `<div class="week-day-col" data-date="${dateStr}">`;

        // Background hour slots (for visual grid)
        for (let h = 0; h < 24; h++) {
            bodyHtml += `<div class="week-hour-slot" data-hour="${h}"></div>`;
        }

        // Positioned tasks
        processedTasks.forEach(task => {
            const totalCols = task.totalColumns || 1;
            const width = 100 / totalCols;
            const left = (task.column || 0) * width;
            const top = (task.startMinutes / (24 * 60)) * 100;
            const height = Math.max(((task.endMinutes - task.startMinutes) / (24 * 60)) * 100, 2); // Min 2% height

            // Get enhanced styling with theme integration
            const styleConfig = getEnhancedEventCardStyles({
                ...task,
                duration: task.endMinutes - task.startMinutes,
                googleCalendarColor: task.googleCalendarColor
            }, document.documentElement.dataset.theme, 'week');

            // Apply unified CSS classes for theme colors
            const cssClasses = [
                'week-task-positioned',
                styleConfig.classes
            ].filter(Boolean).join(' ');

            const positionStyle = `
                position: absolute;
                top: ${top}%;
                left: ${left}%;
                width: calc(${width}% - 2px);
                height: ${height}%;
                min-height: 20px;
            `.replace(/\s+/g, ' ');

            const finalStyle = positionStyle + (styleConfig.style || ''); // Add Google Calendar colors if any

            const statusIcon = getStatusIcon(task.status || 'scheduled');

            // Fix time display for prayer calendar and other synced events
            let timeDisplay = '';
            if (task.displayTime) {
                const fixedTime = fixTimeTranslation(task.displayTime, !!task.googleEventId);
                timeDisplay = formatTimeDisplay(fixedTime);
            }

            bodyHtml += `
                <div class="${cssClasses}" 
                     data-task-id="${task._id || task.id}" 
                     data-original-date="${task.dueDate}"
                     data-original-time="${task.dueTime || task.due_time || ''}"
                     style="${finalStyle}"
                     draggable="true"
                     onclick="openTaskModal('${task._id || task.id}')">
                    <span class="week-task-status">${statusIcon}</span>
                    <span class="week-task-time">${timeDisplay}</span>
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

    // Initialize drag and drop for week view
    setTimeout(() => {
        attachEventTooltips();
        initWeekViewDragDrop();
    }, 100);
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
        const dateStr = formatDateLocal(date); // Format: YYYY-MM-DD

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
            <div class="ticktick-agenda-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                <div class="ticktick-agenda-date">
                    <span class="day-num ${isToday ? 'today' : ''}">${dayNum}</span>
                    <span class="day-name">${dayName}</span>
                </div>
                <div class="ticktick-agenda-events">
                    ${dayTasks.map(t => {
            const time = t.dueTime || t.due_time;
            const isGoogle = !!t.googleEventId;
            const timeStart = formatTime(time);
            const timeEnd = time ? getEndTime(time, isGoogle) : '';
            const timeRange = time ? `${timeStart} - ${timeEnd}` : '';
            const isCompleted = t.status === 'completed';
            const hasPriority = t.priority && t.priority !== 'none';
            const priorityColor = t.priority === 'high' ? '#ff5630' :
                t.priority === 'medium' ? '#ffab00' :
                    t.priority === 'low' ? '#36b37e' : '';

            // Calculate duration for short event detection
            const duration = time ? (isGoogle ? 60 : 30) : 0;

            // Apply enhanced theme-responsive styling
            const eventStyles = getEnhancedEventCardStyles({
                ...t,
                duration,
                googleCalendarColor: t.googleCalendarColor
            }, document.documentElement.dataset.theme, 'agenda');

            // Apply unified CSS classes for theme colors
            const cssClasses = [
                'ticktick-event-card',
                eventStyles.classes,
                isCompleted ? 'completed' : ''
            ].filter(Boolean).join(' ');

            const inlineStyle = eventStyles.style || ''; // Only Google Calendar colors

            return `
                            <div class="ticktick-agenda-row">
                                <div class="ticktick-time-col">
                                    <span class="time-text" style="color: var(--text-primary);">${time ? formatTimeDisplay(fixTimeTranslation(time, isGoogle)) : 'All Day'}</span>
                                    ${isGoogle ? '<span class="calendar-icon">📅</span>' : ''}
                                </div>
                                <div class="${cssClasses}"
                                     ${inlineStyle ? `style="${inlineStyle}"` : ''}
                                     data-task-id="${t._id || t.id}"
                                     data-task-title="${escapeHTML(t.title)}"
                                     data-task-description="${escapeHTML(t.description || '')}"
                                     data-task-time="${timeRange}"
                                     draggable="true"
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

    // Initialize drag and drop for agenda view
    setTimeout(() => {
        attachEventTooltips();
        initAgendaViewDragDrop();
    }, 100);
}

// Helper functions for calendar
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time string (HH:MM) to 12-hour display
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [hours, mins] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Extract time from dueDate ISO string
function getTimeFromDueDate(dueDate) {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    const hours = d.getHours();
    const mins = d.getMinutes();
    // Return null if midnight (likely means no time was set)
    if (hours === 0 && mins === 0) return null;
    return {
        hours,
        mins,
        formatted: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    };
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
        // Load user avatar if available
        if (state.user.avatar) {
            updateSidebarAvatar(state.user.avatar);
        } else {
            // Try loading from localStorage
            loadSavedAvatar();
        }
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
    // Add transition class for smooth theme switching
    document.body.dataset.themeTransitioning = 'true';

    // Set the theme on both body and documentElement for CSS variable inheritance
    document.body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);

    // Update theme cards UI
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === theme);
    });

    // Remove transition class after animation completes
    setTimeout(() => {
        delete document.body.dataset.themeTransitioning;
    }, 400);
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

    const inboxEl = document.getElementById('inbox-count');
    const todayEl = document.getElementById('today-count');
    const weekEl = document.getElementById('week-count');
    const allEl = document.getElementById('all-count');
    const completedEl = document.getElementById('completed-count');
    const wontDoEl = document.getElementById('wont-do-count');

    if (inboxEl) inboxEl.textContent = incomplete.filter(t => !t.list_id).length;
    if (todayEl) todayEl.textContent = incomplete.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
    }).length;
    if (weekEl) weekEl.textContent = incomplete.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= today && due < weekEnd;
    }).length;
    if (allEl) allEl.textContent = incomplete.length;
    if (completedEl) completedEl.textContent = state.tasks.filter(t => t.completed).length;
    if (wontDoEl) wontDoEl.textContent = state.tasks.filter(t => t.status === 'skipped').length;
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

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter to only incomplete tasks that are due today
    const todayTasks = state.tasks.filter(t => {
        // Must not be completed or skipped
        if (t.status === 'completed' || t.status === 'skipped' || t.completed) return false;

        // Must have a due date
        if (!t.dueDate) return false;

        // Due date must be today
        const dueDate = new Date(t.dueDate);
        return dueDate >= today && dueDate < tomorrow;
    });

    select.innerHTML = '<option value="">Select a task for today...</option>' +
        todayTasks.map(task =>
            `<option value="${task.id || task._id}">${escapeHTML(task.title)}</option>`
        ).join('');

    // Show a message if no tasks for today
    if (todayTasks.length === 0) {
        select.innerHTML = '<option value="">No tasks scheduled for today</option>';
    }

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

        // Preserve existing time if task has one
        let newTime = null;
        if (task.dueTime || task.due_time) {
            newTime = task.dueTime || task.due_time;
            // Apply time to the new date
            const [h, m] = newTime.split(':').map(Number);
            localDate.setHours(h, m, 0, 0);
        }

        // Update task
        await updateTaskDateTime(taskId, localDate, newTime);

        showToast('Task moved successfully', 'success');
    } catch (error) {
        console.error('Failed to move task:', error);
        showToast('Failed to move task', 'error');
    }
}

// ============================================
// WEEK VIEW DRAG AND DROP
// ============================================

function initWeekViewDragDrop() {
    const weekTasks = document.querySelectorAll('.week-task-positioned');
    const dayCols = document.querySelectorAll('.week-day-col');

    // Make tasks draggable
    weekTasks.forEach(task => {
        task.draggable = true;
        task.addEventListener('dragstart', handleWeekViewTaskDragStart);
        task.addEventListener('dragend', handleWeekViewTaskDragEnd);
    });

    // Make day columns droppable
    dayCols.forEach(col => {
        col.addEventListener('dragover', handleWeekViewColDragOver);
        col.addEventListener('drop', handleWeekViewColDrop);
        col.addEventListener('dragleave', handleWeekViewColDragLeave);
    });
}

function handleWeekViewTaskDragStart(e) {
    e.stopPropagation();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.dataTransfer.setData('application/view', 'week');
}

function handleWeekViewTaskDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.week-day-col.drag-over').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleWeekViewColDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleWeekViewColDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleWeekViewColDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const dateStr = e.currentTarget.dataset.date; // Format: YYYY-MM-DD

    if (!taskId || !dateStr) return;

    // Calculate time from Y position within the day column
    const colRect = e.currentTarget.getBoundingClientRect();
    const dropY = e.clientY - colRect.top;
    const colHeight = colRect.height;
    const positionRatio = Math.max(0, Math.min(1, dropY / colHeight));

    // Convert to hours and minutes (24 hours in a day)
    const totalMinutes = Math.round(positionRatio * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Round minutes to nearest 15 for better UX
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const finalHours = roundedMinutes >= 60 ? hours + 1 : hours;
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;

    try {
        // Parse date
        const [year, month, day] = dateStr.split('-').map(Number);
        const newDate = new Date(year, month - 1, day, finalHours, finalMinutes, 0, 0);

        // Format time as HH:MM
        const newTime = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

        // Update task
        await updateTaskDateTime(taskId, newDate, newTime);

        showToast(`Task moved to ${formatTimeDisplay(newTime)}`, 'success');
    } catch (error) {
        console.error('Failed to move task in week view:', error);
        showToast('Failed to move task', 'error');
    }
}

// ============================================
// DAY VIEW DRAG AND DROP
// ============================================

function initDayViewDragDrop() {
    const dayTasks = document.querySelectorAll('.day-task-positioned');
    const hourSlots = document.querySelectorAll('.day-hour-slot');

    // Make tasks draggable
    dayTasks.forEach(task => {
        task.draggable = true;
        task.addEventListener('dragstart', handleDayViewTaskDragStart);
        task.addEventListener('dragend', handleDayViewTaskDragEnd);
    });

    // Make hour slots droppable
    hourSlots.forEach(slot => {
        slot.addEventListener('dragover', handleDayViewSlotDragOver);
        slot.addEventListener('drop', handleDayViewSlotDrop);
        slot.addEventListener('dragleave', handleDayViewSlotDragLeave);
    });
}

function handleDayViewTaskDragStart(e) {
    e.stopPropagation();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.dataTransfer.setData('application/view', 'day');
}

function handleDayViewTaskDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.day-hour-slot.drag-over').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

function handleDayViewSlotDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDayViewSlotDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleDayViewSlotDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const hourStr = e.currentTarget.dataset.hour; // Format: "09" or "14"

    if (!taskId || !hourStr) return;

    try {
        // Calculate minutes from Y position within the hour slot
        const slotRect = e.currentTarget.getBoundingClientRect();
        const dropY = e.clientY - slotRect.top;
        const slotHeight = slotRect.height;
        const positionRatio = Math.max(0, Math.min(1, dropY / slotHeight));

        // Convert to minutes within the hour (0-59)
        const minutes = Math.round(positionRatio * 60);
        const roundedMinutes = Math.round(minutes / 15) * 15; // Round to nearest 15 minutes
        const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
        const finalHour = roundedMinutes >= 60 ? parseInt(hourStr) + 1 : parseInt(hourStr);

        // Create new date with the selected time
        const newDate = new Date(state.calendarDate);
        newDate.setHours(finalHour, finalMinutes, 0, 0);

        // Format time as HH:MM
        const newTime = `${finalHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

        // Update task
        await updateTaskDateTime(taskId, newDate, newTime);

        showToast(`Task moved to ${formatTimeDisplay(newTime)}`, 'success');
    } catch (error) {
        console.error('Failed to move task in day view:', error);
        showToast('Failed to move task', 'error');
    }
}

// ============================================
// AGENDA VIEW DRAG AND DROP
// ============================================

function initAgendaViewDragDrop() {
    const agendaTasks = document.querySelectorAll('.ticktick-event-card');
    const agendaDays = document.querySelectorAll('.ticktick-agenda-day');

    // Make tasks draggable
    agendaTasks.forEach(task => {
        task.draggable = true;
        task.addEventListener('dragstart', handleAgendaViewTaskDragStart);
        task.addEventListener('dragend', handleAgendaViewTaskDragEnd);
    });

    // Make agenda days droppable
    agendaDays.forEach(day => {
        day.addEventListener('dragover', handleAgendaViewDayDragOver);
        day.addEventListener('drop', handleAgendaViewDayDrop);
        day.addEventListener('dragleave', handleAgendaViewDayDragLeave);
    });
}

function handleAgendaViewTaskDragStart(e) {
    e.stopPropagation();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.dataTransfer.setData('application/view', 'agenda');
}

function handleAgendaViewTaskDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.ticktick-agenda-day.drag-over').forEach(day => {
        day.classList.remove('drag-over');
    });
}

function handleAgendaViewDayDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleAgendaViewDayDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleAgendaViewDayDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const dateStr = e.currentTarget.dataset.date; // Format: YYYY-MM-DD

    if (!taskId || !dateStr) return;

    try {
        // Parse date from data attribute
        const [year, month, day] = dateStr.split('-').map(Number);
        const newDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Set to noon to avoid timezone issues

        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (!task) return;

        // Preserve existing time if task has one
        const existingTime = task.dueTime || task.due_time || null;

        // Update task
        await updateTaskDateTime(taskId, newDate, existingTime);

        showToast('Task moved successfully', 'success');
    } catch (error) {
        console.error('Failed to move task in agenda view:', error);
        showToast('Failed to move task', 'error');
    }
}

// ============================================
// UNIFIED TASK DATE/TIME UPDATE FUNCTION
// ============================================

async function updateTaskDateTime(taskId, newDate, newTime = null) {
    try {
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (!task) return;

        // If newTime is provided, use it; otherwise preserve existing time
        const timeToUse = newTime !== null ? newTime : (task.dueTime || task.due_time || null);

        // If time exists, apply it to the date
        if (timeToUse) {
            const [h, m] = timeToUse.split(':').map(Number);
            newDate.setHours(h, m, 0, 0);
        } else {
            // No time, set to noon to avoid timezone issues
            newDate.setHours(12, 0, 0, 0);
        }

        // Prepare update object
        const updateData = { dueDate: newDate.toISOString() };
        if (timeToUse !== null) {
            updateData.dueTime = timeToUse;
        }

        // Update via API
        await api.updateTask(taskId, updateData);

        // Update local state
        const taskIndex = state.tasks.findIndex(t => (t._id || t.id) === taskId);
        if (taskIndex !== -1) {
            state.tasks[taskIndex] = {
                ...state.tasks[taskIndex],
                dueDate: newDate.toISOString(),
                dueTime: timeToUse,
                due_time: timeToUse
            };
        }

        // Re-render all calendar views
        updateAllViews();
    } catch (error) {
        console.error('Failed to update task date/time:', error);
        throw error;
    }
}

// ============================================
// ENHANCED TIME FORMATTING FOR PRAYER CALENDAR
// ============================================

// Fix time translation issues for synced events (especially prayer calendar)
function fixTimeTranslation(timeStr, isGoogleEvent = false) {
    if (!timeStr) return null;

    // Handle different time formats from Google Calendar
    if (typeof timeStr === 'string') {
        // Handle ISO date strings from Google Calendar
        if (timeStr.includes('T') || timeStr.includes('Z')) {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }
        }

        // Handle HH:MM format
        if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
            return timeStr;
        }

        // Handle H:MM format (single digit hour)
        if (timeStr.match(/^\d:\d{2}$/)) {
            return `0${timeStr}`;
        }
    }

    return timeStr;
}

// Enhanced time display formatting with proper 12-hour conversion
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';

    // Fix time translation first
    const fixedTime = fixTimeTranslation(timeStr);
    if (!fixedTime) return '';

    const [hours, mins] = fixedTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(mins)) return '';

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
}



// Helper: Get consistent color for an event based on its ID
function getEventColor(id) {
    if (!id) return 'var(--accent-primary)';

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Map to one of the 10 palette colors (0-9)
    const index = Math.abs(hash % 10);
    return `var(--evt-${index})`;
}

// Enhanced event card styling with proper theme integration
// ALL events use the same unified styling - no Google Calendar color overrides
function getEnhancedEventCardStyles(event, theme, view = 'month') {
    const isShort = event.duration && event.duration < 30; // minutes
    const status = event.status || 'scheduled';

    // Base unified classes - all cards inherit from event-card-base
    let unifiedClasses = ['event-card-base'];

    // Add status class for consistent styling across all views
    unifiedClasses.push(`status-${status}`);

    // Add view-specific classes
    if (view === 'week') {
        unifiedClasses.push('event-card-week');
    } else if (view === 'agenda') {
        unifiedClasses.push('event-card-agenda');
    } else if (view === 'day') {
        unifiedClasses.push('event-card-day');
    } else {
        unifiedClasses.push('event-card-month');
    }

    // Short duration events get special class
    if (isShort) {
        unifiedClasses.push('event-card-short');
    }

    // ALL events get a consistent hashed accent color for the left border
    // This includes Google Calendar events - we no longer use googleCalendarColor for backgrounds
    const eventColor = getEventColor(event._id || event.id || event.title);
    const inlineStyles = `border-left: 4px solid ${eventColor} !important;`;

    return {
        style: inlineStyles,
        classes: unifiedClasses.join(' ')
    };
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
// Event tooltip functionality
function showEventTooltip(event, element) {
    const title = element.dataset.taskTitle || '';
    const description = element.dataset.taskDescription || '';
    const time = element.dataset.taskTime || '';

    if (!title && !description) return;

    // Remove existing tooltip
    const existingTooltip = document.querySelector('.event-tooltip');
    if (existingTooltip) existingTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'event-tooltip';
    tooltip.innerHTML = `
        ${time ? `<div class="tooltip-time">${time}</div>` : ''}
        <div class="tooltip-title">${escapeHTML(title)}</div>
        ${description ? `<div class="tooltip-description">${escapeHTML(description)}</div>` : ''}
    `;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.bottom + 8;

    // Adjust if tooltip goes off screen
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
    }
    if (top + tooltipRect.height > window.innerHeight - 8) {
        top = rect.top - tooltipRect.height - 8;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add('visible');

    // Remove tooltip on mouse leave or click
    const removeTooltip = () => {
        tooltip.classList.remove('visible');
        setTimeout(() => tooltip.remove(), 200);
    };

    element.addEventListener('mouseleave', removeTooltip, { once: true });
    element.addEventListener('click', removeTooltip, { once: true });
}

// Attach tooltip listeners to event cards
function attachEventTooltips() {
    document.querySelectorAll('.calendar-task.short-duration, .ticktick-event-card.short-duration').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            showEventTooltip(e, card);
        });
    });
}

// ==========================================
// HIERARCHICAL TAG SYSTEM
// ==========================================

// Render hierarchical tag tree in sidebar
function renderTags() {
    const tagsTree = document.getElementById('tags-tree');
    if (!tagsTree) return;

    const tags = state.tags || [];

    if (tags.length === 0) {
        tagsTree.innerHTML = '<li class="empty-message">No tags yet</li>';
        return;
    }

    // Separate parent and child tags
    const parentTags = tags.filter(t => !t.parentId);
    const childTagMap = {};

    tags.filter(t => t.parentId).forEach(child => {
        if (!childTagMap[child.parentId]) {
            childTagMap[child.parentId] = [];
        }
        childTagMap[child.parentId].push(child);
    });

    // Build HTML
    let html = '';
    parentTags.forEach(parent => {
        const children = childTagMap[parent._id] || [];
        const hasChildren = children.length > 0;
        const isExpanded = localStorage.getItem(`tag-expanded-${parent._id}`) !== 'false';

        html += `
            <li class="tag-item parent-tag ${hasChildren ? 'has-children' : ''}" data-tag-id="${parent._id}" data-full-path="${parent.fullPath}">
                <div class="tag-row" data-full-path="${parent.fullPath}">
                    ${hasChildren ? `<button class="tag-toggle ${isExpanded ? 'expanded' : ''}" data-parent-id="${parent._id}">▶</button>` : '<span class="tag-spacer"></span>'}
                    <span class="tag-icon" style="color: ${parent.color || '#8B5CF6'}">#</span>
                    <span class="tag-name">${parent.name}</span>
                    <span class="tag-count">${parent.taskCount || 0}</span>
                </div>
                ${hasChildren ? `
                    <ul class="tag-children ${isExpanded ? '' : 'collapsed'}">
                        ${children.map(child => `
                            <li class="tag-item child-tag" data-tag-id="${child._id}" data-full-path="${child.fullPath}">
                                <div class="tag-row" data-full-path="${child.fullPath}">
                                    <span class="tag-spacer"></span>
                                    <span class="tag-icon" style="color: ${child.color || parent.color || '#8B5CF6'}">#</span>
                                    <span class="tag-name">${child.name}</span>
                                    <span class="tag-count">${child.taskCount || 0}</span>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
            </li>
        `;
    });

    tagsTree.innerHTML = html;

    // Add toggle listeners
    tagsTree.querySelectorAll('.tag-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const parentId = toggle.dataset.parentId;
            const children = toggle.closest('.tag-item').querySelector('.tag-children');
            const isExpanded = toggle.classList.contains('expanded');

            toggle.classList.toggle('expanded');
            if (children) {
                children.classList.toggle('collapsed');
            }
            localStorage.setItem(`tag-expanded-${parentId}`, !isExpanded);
        });
    });

    // Add context menu listeners for tags
    tagsTree.querySelectorAll('.tag-item').forEach(tagItem => {
        tagItem.addEventListener('contextmenu', (e) => {
            const tagId = tagItem.dataset.tagId;
            const isDiscovered = tagId && tagId.startsWith('discovered_');
            if (!isDiscovered && tagId) {
                showContextMenu(e, 'tag', tagId);
            } else {
                // For discovered tags, show a message
                e.preventDefault();
                showToast('This tag was auto-discovered from tasks. Create it explicitly to edit.', 'info');
            }
        });
    });

    // Add click handlers for tag rows (for navigation)
    tagsTree.querySelectorAll('.tag-row').forEach(tagRow => {
        tagRow.addEventListener('click', (e) => {
            // Don't navigate if clicking toggle button
            if (e.target.closest('.tag-toggle')) return;
            const fullPath = tagRow.dataset.fullPath;
            if (fullPath) {
                selectTag(fullPath);
            }
        });
    });
}

// Select tag for filtering
function selectTag(fullPath) {
    state.currentTag = fullPath;
    state.currentList = null;
    state.currentView = 'tag';

    // Save to localStorage for page reload persistence
    localStorage.setItem('currentView', 'tag');
    localStorage.setItem('currentTag', fullPath);

    // Update UI - clear all active states
    document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tag-item').forEach(el => {
        el.classList.toggle('active', el.dataset.fullPath === fullPath);
    });

    // Update title
    const tag = state.tags.find(t => t.fullPath === fullPath);
    const title = tag ? `Tag: ${formatTagDisplay(fullPath)}` : 'Tags';
    if (elements.currentViewTitle) {
        elements.currentViewTitle.textContent = title;
    }

    // IMPORTANT: Show tasks view (hide other views first)
    if (elements.habitsView) elements.habitsView.classList.add('hidden');
    if (elements.calendarView) elements.calendarView.classList.add('hidden');
    if (elements.settingsView) elements.settingsView.classList.add('hidden');
    if (elements.pomodoroView) elements.pomodoroView.classList.add('hidden');
    if (elements.statsView) elements.statsView.classList.add('hidden');
    const matrixView = document.getElementById('matrix-view');
    if (matrixView) matrixView.classList.add('hidden');

    // Show tasks view
    if (elements.tasksView) elements.tasksView.classList.remove('hidden');

    // Filter and render tasks
    renderTasks();
}

// Format tag for display: "work:meetings" -> "Work: Meetings"
function formatTagDisplay(fullPath) {
    if (!fullPath) return '';
    return fullPath.split(':').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1)
    ).join(': ');
}

// Create new tag
async function createTag(name, parentId = null, color = '#8B5CF6') {
    try {
        const newTag = await api.createTag({ name, parentId, color });
        state.tags.push(newTag);
        renderTags();
        showToast(`Tag "${name}" created`, 'success');
        return newTag;
    } catch (error) {
        console.error('Failed to create tag:', error);
        showToast('Failed to create tag', 'error');
        throw error;
    }
}

// Delete tag
async function deleteTag(tagId) {
    if (!confirm('Delete this tag and all its children?')) return;

    try {
        await api.deleteTag(tagId);
        state.tags = state.tags.filter(t => t._id !== tagId && t.parentId !== tagId);
        renderTags();
        showToast('Tag deleted', 'success');
    } catch (error) {
        console.error('Failed to delete tag:', error);
        showToast('Failed to delete tag', 'error');
    }
}

// Duplicate tag
async function duplicateTag(tagId) {
    const originalTag = state.tags.find(t => t._id === tagId);
    if (!originalTag) {
        showToast('Tag not found', 'error');
        return;
    }

    // Check if it's a discovered tag
    if (tagId && tagId.startsWith('discovered_')) {
        showToast('Cannot duplicate auto-discovered tags', 'error');
        return;
    }

    try {
        // Create a copy with a modified name
        const newName = `${originalTag.name} (copy)`;
        const newTag = await api.createTag({
            name: newName,
            parentId: originalTag.parentId || null,
            color: originalTag.color || '#8B5CF6'
        });
        state.tags.push(newTag);
        renderTags();
        showToast(`Tag "${newName}" created`, 'success');
    } catch (error) {
        console.error('Failed to duplicate tag:', error);
        // Check if error is due to duplicate name
        if (error.message && error.message.includes('already exists')) {
            showToast('A tag with this name already exists', 'error');
        } else {
            showToast('Failed to duplicate tag', 'error');
        }
    }
}

// Open tag creation modal
function openTagModal(parentId = null) {
    const parentTag = parentId ? state.tags.find(t => t._id === parentId) : null;
    const modalHtml = `
        <div id="tag-modal" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${parentTag ? `Add Child Tag to "${parentTag.name}"` : 'Add New Tag'}</h2>
                    <button class="btn-icon close-modal" id="close-tag-modal">&times;</button>
                </div>
                <form id="tag-form">
                    <div class="form-group">
                        <label for="tag-name">Tag Name</label>
                        <input type="text" id="tag-name" placeholder="e.g. Work, Personal, Projects" required>
                    </div>
                    ${!parentId ? `
                    <div class="form-group">
                        <label for="tag-parent">Parent Tag (optional)</label>
                        <select id="tag-parent">
                            <option value="">None (create as parent)</option>
                            ${state.tags.filter(t => !t.parentId).map(t =>
        `<option value="${t._id}">${t.name}</option>`
    ).join('')}
                        </select>
                    </div>
                    ` : `<input type="hidden" id="tag-parent" value="${parentId}">`}
                    <div class="form-group">
                        <label for="tag-color">Color</label>
                        <input type="color" id="tag-color" value="#8B5CF6">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeTagModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Tag</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('tag-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners
    document.getElementById('close-tag-modal').addEventListener('click', closeTagModal);
    document.querySelector('#tag-modal .modal-overlay').addEventListener('click', closeTagModal);
    document.getElementById('tag-form').addEventListener('submit', handleTagSubmit);

    // Focus input
    document.getElementById('tag-name').focus();
}

function closeTagModal() {
    const modal = document.getElementById('tag-modal');
    if (modal) modal.remove();
}

async function handleTagSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('tag-name').value.trim();
    const parentId = document.getElementById('tag-parent')?.value || null;
    const color = document.getElementById('tag-color').value;

    if (!name) {
        showToast('Please enter a tag name', 'error');
        return;
    }

    try {
        await createTag(name, parentId || null, color);
        closeTagModal();
    } catch (error) {
        // Error handled in createTag
    }
}

// Add tag button event listener
document.addEventListener('DOMContentLoaded', () => {
    const addTagBtn = document.getElementById('add-tag-btn');
    if (addTagBtn) {
        addTagBtn.addEventListener('click', () => openTagModal());
    }
});

// Make functions globally available
window.selectTag = selectTag;
window.openTagModal = openTagModal;
window.closeTagModal = closeTagModal;
window.deleteTag = deleteTag;
window.duplicateTag = duplicateTag;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize notification manager
    if (window.notificationManager && window.notificationManager.isSupported) {
        window.notificationManager.init();
    }
});
