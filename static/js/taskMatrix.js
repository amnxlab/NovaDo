/**
 * Task Matrix Module
 * ADHD-optimized task visualization with four-dimensional classification
 * Requirements: 1.1-1.8, 2.1-2.7, 3.1-3.6
 */

// Task Matrix State
const matrixState = {
    currentView: 'eisenhower', // 'eisenhower', 'kanban', 'list', 'dashboard'
    fourthDimensionType: 'energy', // 'energy' or 'time_of_day'
    focusModeEnabled: false,
    filters: {
        priorities: [],
        statuses: [],
        tags: [],
        fourthDimension: []
    },
    preferences: {
        animationsEnabled: true,
        soundEnabled: true,
        calmModeEnabled: false,
        animationSpeed: 'normal'
    },
    streaks: {
        current: 0,
        longest: 0,
        highPriority: 0,
        highEnergy: 0
    }
};

// Constants
const PRIORITY_LEVELS = ['high', 'medium', 'low'];
const STATUS_VALUES = ['todo', 'in_progress', 'scheduled', 'completed', 'skipped'];
const ENERGY_LEVELS = ['high', 'medium', 'low'];
const TIME_OF_DAY = ['morning', 'afternoon', 'evening'];

const STATUS_ICONS = {
    completed: '✅',
    skipped: '❌',
    in_progress: '⏳',
    scheduled: '📅',
    todo: '○'
};

const ENERGY_ICONS = {
    high: '🔥',
    medium: '☕',
    low: '🪫'
};

const TIME_ICONS = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙'
};

const PRIORITY_COLORS = {
    high: 'var(--priority-high)',
    medium: 'var(--priority-medium)',
    low: 'var(--priority-low)'
};

// Initialize Task Matrix
function initTaskMatrix() {
    loadMatrixPreferences();
    renderMatrixHeader();
    renderFilterBar();
    renderCurrentView();
    setupMatrixEventListeners();
    setupKeyboardShortcuts();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Load preferences from localStorage
function loadMatrixPreferences() {
    const saved = localStorage.getItem('matrixPreferences');
    if (saved) {
        const prefs = JSON.parse(saved);
        Object.assign(matrixState, prefs);
    }

    // Respect system motion preferences (Requirement 11.5)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        matrixState.preferences.animationsEnabled = false;
    }
}

// Save preferences to localStorage
function saveMatrixPreferences() {
    const toSave = {
        currentView: matrixState.currentView,
        fourthDimensionType: matrixState.fourthDimensionType,
        focusModeEnabled: matrixState.focusModeEnabled,
        filters: matrixState.filters,
        preferences: matrixState.preferences
    };
    localStorage.setItem('matrixPreferences', JSON.stringify(toSave));
}


// Render Matrix Header with View Switcher (Requirement 3.1, 3.2)
function renderMatrixHeader() {
    const header = document.getElementById('matrix-header');
    if (!header) return;

    header.innerHTML = `
        <div class="matrix-view-switcher">
            <button class="matrix-view-btn ${matrixState.currentView === 'eisenhower' ? 'active' : ''}" 
                    data-view="eisenhower" title="Eisenhower Matrix">
                <i data-lucide="grid-2x2"></i>
                <span>Matrix</span>
            </button>
            <button class="matrix-view-btn ${matrixState.currentView === 'kanban' ? 'active' : ''}" 
                    data-view="kanban" title="Kanban Board">
                <i data-lucide="columns-3"></i>
                <span>Kanban</span>
            </button>
            <button class="matrix-view-btn ${matrixState.currentView === 'list' ? 'active' : ''}" 
                    data-view="list" title="Smart List">
                <i data-lucide="list"></i>
                <span>List</span>
            </button>
            <button class="matrix-view-btn ${matrixState.currentView === 'dashboard' ? 'active' : ''}" 
                    data-view="dashboard" title="Dashboard">
                <i data-lucide="layout-dashboard"></i>
                <span>Dashboard</span>
            </button>
        </div>
        <div class="matrix-header-actions">
            <button class="matrix-btn matrix-btn-secondary" id="matrix-focus-toggle" 
                    title="Toggle Focus Mode (F)">
                <i data-lucide="${matrixState.focusModeEnabled ? 'eye-off' : 'focus'}"></i>
                <span>${matrixState.focusModeEnabled ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>
            <button class="matrix-btn matrix-btn-secondary" id="matrix-4d-toggle" 
                    title="Toggle 4th Dimension">
                <i data-lucide="layers"></i>
                <span>${matrixState.fourthDimensionType === 'energy' ? 'Energy' : 'Time'}</span>
            </button>
            <button class="matrix-btn matrix-btn-primary" id="matrix-ai-btn" 
                    title="AI Suggestions">
                <i data-lucide="sparkles"></i>
                <span>AI Resort</span>
            </button>
        </div>
    `;

    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Debounce utility for filter updates (Requirement 16.6 - 150ms debounce)
let filterDebounceTimer = null;
function debounceFilterUpdate(callback, delay = 150) {
    if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
    }
    filterDebounceTimer = setTimeout(callback, delay);
}

// Render Filter Bar (Requirement 16.1-16.9)
function renderFilterBar() {
    const filterBar = document.getElementById('matrix-filter-bar');
    if (!filterBar) return;

    const activeFilterCount = getActiveFilterCount();
    const availableTags = getAvailableTags();

    filterBar.innerHTML = `
        <div class="filter-group" role="group" aria-label="Priority filters">
            <span class="filter-label" id="priority-filter-label">Priority</span>
            <div class="filter-chips" role="listbox" aria-labelledby="priority-filter-label">
                ${PRIORITY_LEVELS.map(p => `
                    <button class="filter-chip ${matrixState.filters.priorities.includes(p) ? 'active' : ''}" 
                            data-filter="priority" data-value="${p}"
                            role="option"
                            aria-selected="${matrixState.filters.priorities.includes(p)}"
                            aria-label="${p.charAt(0).toUpperCase() + p.slice(1)} priority">
                        <span class="priority-dot priority-${p}" aria-hidden="true"></span>
                        ${p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="filter-group" role="group" aria-label="Status filters">
            <span class="filter-label" id="status-filter-label">Status</span>
            <div class="filter-chips" role="listbox" aria-labelledby="status-filter-label">
                ${STATUS_VALUES.map(s => `
                    <button class="filter-chip ${matrixState.filters.statuses.includes(s) ? 'active' : ''}" 
                            data-filter="status" data-value="${s}"
                            role="option"
                            aria-selected="${matrixState.filters.statuses.includes(s)}"
                            aria-label="${formatStatusLabel(s)} status">
                        <span class="status-icon" aria-hidden="true">${STATUS_ICONS[s]}</span>
                        ${formatStatusLabel(s)}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="filter-group filter-group-tags" role="group" aria-label="Tag filters">
            <span class="filter-label" id="tags-filter-label">Tags</span>
            <div class="filter-tags-container">
                <button class="filter-chip filter-tags-trigger" 
                        id="tags-dropdown-trigger"
                        aria-haspopup="listbox"
                        aria-expanded="false"
                        aria-label="Select tags to filter">
                    <i data-lucide="tag" aria-hidden="true"></i>
                    ${matrixState.filters.tags.length > 0
            ? `${matrixState.filters.tags.length} selected`
            : 'All Tags'}
                    <i data-lucide="chevron-down" class="dropdown-arrow" aria-hidden="true"></i>
                </button>
                <div class="filter-tags-dropdown" id="tags-dropdown" role="listbox" aria-labelledby="tags-filter-label">
                    <div class="tags-search-container">
                        <input type="text" 
                               class="tags-search-input" 
                               id="tags-search-input"
                               placeholder="Search tags..."
                               aria-label="Search tags">
                        <i data-lucide="search" class="tags-search-icon" aria-hidden="true"></i>
                    </div>
                    <div class="tags-list" id="tags-list">
                        ${availableTags.length > 0 ? availableTags.map(tag => `
                            <button class="tag-option ${matrixState.filters.tags.includes(tag) ? 'active' : ''}"
                                    data-tag="${escapeHtml(tag)}"
                                    role="option"
                                    aria-selected="${matrixState.filters.tags.includes(tag)}">
                                <span class="tag-checkbox" aria-hidden="true">
                                    ${matrixState.filters.tags.includes(tag) ? '✓' : ''}
                                </span>
                                #${escapeHtml(tag)}
                            </button>
                        `).join('') : '<div class="tags-empty">No tags available</div>'}
                    </div>
                    ${matrixState.filters.tags.length > 0 ? `
                        <button class="tags-clear-btn" id="clear-tags-btn">
                            Clear tag filters
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
        <div class="filter-group" role="group" aria-label="${matrixState.fourthDimensionType === 'energy' ? 'Energy' : 'Time of day'} filters">
            <span class="filter-label" id="fourth-dim-filter-label">${matrixState.fourthDimensionType === 'energy' ? 'Energy' : 'Time'}</span>
            <div class="filter-chips" role="listbox" aria-labelledby="fourth-dim-filter-label">
                ${(matrixState.fourthDimensionType === 'energy' ? ENERGY_LEVELS : TIME_OF_DAY).map(v => `
                    <button class="filter-chip ${matrixState.filters.fourthDimension.includes(v) ? 'active' : ''}" 
                            data-filter="fourthDimension" data-value="${v}"
                            role="option"
                            aria-selected="${matrixState.filters.fourthDimension.includes(v)}"
                            aria-label="${v.charAt(0).toUpperCase() + v.slice(1)} ${matrixState.fourthDimensionType === 'energy' ? 'energy' : 'time'}">
                        <span aria-hidden="true">${matrixState.fourthDimensionType === 'energy' ? ENERGY_ICONS[v] : TIME_ICONS[v]}</span>
                        ${v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="filter-actions">
            ${activeFilterCount > 0 ? `
                <span class="filter-count" aria-live="polite">${activeFilterCount} active</span>
                <button class="matrix-btn matrix-btn-text" id="clear-filters-btn" aria-label="Clear all filters">
                    <i data-lucide="x" aria-hidden="true"></i> Clear All
                </button>
            ` : ''}
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Setup tags dropdown event listeners
    setupTagsDropdown();
}

// Get all available tags from tasks
function getAvailableTags() {
    const tasks = state.tasks || [];
    const tagSet = new Set();

    tasks.forEach(task => {
        if (task.tags && Array.isArray(task.tags)) {
            task.tags.forEach(tag => tagSet.add(tag));
        }
    });

    return Array.from(tagSet).sort();
}

// Setup tags dropdown functionality
function setupTagsDropdown() {
    const trigger = document.getElementById('tags-dropdown-trigger');
    const dropdown = document.getElementById('tags-dropdown');
    const searchInput = document.getElementById('tags-search-input');
    const tagsList = document.getElementById('tags-list');
    const clearTagsBtn = document.getElementById('clear-tags-btn');

    if (!trigger || !dropdown) return;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', !isExpanded);
        dropdown.classList.toggle('open');

        if (!isExpanded && searchInput) {
            setTimeout(() => searchInput.focus(), 50);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-group-tags')) {
            trigger.setAttribute('aria-expanded', 'false');
            dropdown.classList.remove('open');
        }
    });

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            debounceFilterUpdate(() => {
                filterTagsList(searchTerm);
            }, 150);
        });
    }

    // Tag selection
    if (tagsList) {
        tagsList.addEventListener('click', (e) => {
            const tagOption = e.target.closest('.tag-option');
            if (tagOption) {
                const tag = tagOption.dataset.tag;
                toggleTagFilter(tag);
            }
        });
    }

    // Clear tags button
    if (clearTagsBtn) {
        clearTagsBtn.addEventListener('click', () => {
            matrixState.filters.tags = [];
            saveMatrixPreferences();
            renderFilterBar();
            debounceFilterUpdate(() => renderCurrentView(), 150);
        });
    }
}

// Filter tags list based on search term
function filterTagsList(searchTerm) {
    const tagOptions = document.querySelectorAll('.tag-option');

    tagOptions.forEach(option => {
        const tagName = option.dataset.tag.toLowerCase();
        if (tagName.includes(searchTerm)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
}

// Toggle tag filter
function toggleTagFilter(tag) {
    const index = matrixState.filters.tags.indexOf(tag);
    if (index > -1) {
        matrixState.filters.tags.splice(index, 1);
    } else {
        matrixState.filters.tags.push(tag);
    }

    saveMatrixPreferences();
    renderFilterBar();
    debounceFilterUpdate(() => renderCurrentView(), 150);
}

function formatStatusLabel(status) {
    const labels = {
        todo: 'To Do',
        in_progress: 'In Progress',
        scheduled: 'Scheduled',
        completed: 'Completed',
        skipped: 'Skipped'
    };
    return labels[status] || status;
}

function getActiveFilterCount() {
    return matrixState.filters.priorities.length +
        matrixState.filters.statuses.length +
        matrixState.filters.tags.length +
        matrixState.filters.fourthDimension.length;
}


// Render Current View (Requirement 3.3 - smooth transitions)
function renderCurrentView() {
    const container = document.getElementById('matrix-view-container');
    if (!container) return;

    // Apply fade transition if animations enabled
    if (matrixState.preferences.animationsEnabled) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 200ms ease';
    }

    setTimeout(() => {
        switch (matrixState.currentView) {
            case 'eisenhower':
                renderEisenhowerView(container);
                break;
            case 'kanban':
                renderKanbanView(container);
                break;
            case 'list':
                renderListView(container);
                break;
            case 'dashboard':
                renderDashboardView(container);
                break;
        }

        if (matrixState.preferences.animationsEnabled) {
            container.style.opacity = '1';
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, matrixState.preferences.animationsEnabled ? 50 : 0);
}

// Get filtered tasks
function getFilteredTasks() {
    let tasks = [...(state.tasks || [])];

    // Apply priority filter
    if (matrixState.filters.priorities.length > 0) {
        tasks = tasks.filter(t => {
            const priority = getPriorityLabel(t.priority);
            return matrixState.filters.priorities.includes(priority);
        });
    }

    // Apply status filter
    if (matrixState.filters.statuses.length > 0) {
        tasks = tasks.filter(t => {
            const status = getTaskStatus(t);
            return matrixState.filters.statuses.includes(status);
        });
    }

    // Apply fourth dimension filter
    if (matrixState.filters.fourthDimension.length > 0) {
        tasks = tasks.filter(t => {
            const value = matrixState.fourthDimensionType === 'energy'
                ? (t.energyLevel || 'medium')
                : (t.timeOfDay || 'morning');
            return matrixState.filters.fourthDimension.includes(value);
        });
    }

    // Apply focus mode limit (Requirement 10.3)
    if (matrixState.focusModeEnabled) {
        tasks = tasks
            .filter(t => !t.completed && getTaskStatus(t) !== 'skipped')
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
            .slice(0, 5);
    }

    return tasks;
}

function getPriorityLabel(priority) {
    if (typeof priority === 'number') {
        return priority >= 3 ? 'high' : priority >= 2 ? 'medium' : 'low';
    }
    return priority || 'low';
}

function getTaskStatus(task) {
    if (task.status) return task.status;
    if (task.completed) return 'completed';
    return 'todo';
}

// Eisenhower Matrix View (Requirement 4.1-4.9)
function renderEisenhowerView(container) {
    const tasks = getFilteredTasks();

    // Categorize tasks into quadrants
    const quadrants = {
        doFirst: [],      // Urgent + Important
        schedule: [],     // Not Urgent + Important
        delegate: [],     // Urgent + Not Important
        eliminate: []     // Not Urgent + Not Important
    };

    tasks.forEach(task => {
        const quadrant = getEisenhowerQuadrant(task);
        quadrants[quadrant].push(task);
    });

    // Sort completed tasks to bottom within each quadrant (Requirement 4.9)
    Object.keys(quadrants).forEach(key => {
        quadrants[key].sort((a, b) => {
            const aCompleted = getTaskStatus(a) === 'completed';
            const bCompleted = getTaskStatus(b) === 'completed';
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
            return (b.priority || 0) - (a.priority || 0);
        });
    });

    container.innerHTML = `
        <div class="eisenhower-grid ${matrixState.focusModeEnabled ? 'focus-mode' : ''}">
            <div class="quadrant quadrant-do-first" data-quadrant="doFirst">
                <div class="quadrant-header">
                    <span class="quadrant-icon">🔴</span>
                    <h3>Do First</h3>
                    <span class="quadrant-count">${quadrants.doFirst.length}</span>
                    <button class="quadrant-clear-btn" data-quadrant="doFirst" title="Clear Quadrant">
                        <i data-lucide="check-check"></i>
                    </button>
                </div>
                <div class="quadrant-tasks" data-droppable="doFirst">
                    ${renderQuadrantTasks(quadrants.doFirst)}
                </div>
            </div>
            <div class="quadrant quadrant-schedule" data-quadrant="schedule">
                <div class="quadrant-header">
                    <span class="quadrant-icon">🔵</span>
                    <h3>Schedule</h3>
                    <span class="quadrant-count">${quadrants.schedule.length}</span>
                    <button class="quadrant-clear-btn" data-quadrant="schedule" title="Clear Quadrant">
                        <i data-lucide="check-check"></i>
                    </button>
                </div>
                <div class="quadrant-tasks" data-droppable="schedule">
                    ${renderQuadrantTasks(quadrants.schedule)}
                </div>
            </div>
            <div class="quadrant quadrant-delegate" data-quadrant="delegate">
                <div class="quadrant-header">
                    <span class="quadrant-icon">🟡</span>
                    <h3>Quick Wins</h3>
                    <span class="quadrant-count">${quadrants.delegate.length}</span>
                    <button class="quadrant-clear-btn" data-quadrant="delegate" title="Clear Quadrant">
                        <i data-lucide="check-check"></i>
                    </button>
                </div>
                <div class="quadrant-tasks" data-droppable="delegate">
                    ${renderQuadrantTasks(quadrants.delegate)}
                </div>
            </div>
            <div class="quadrant quadrant-eliminate" data-quadrant="eliminate">
                <div class="quadrant-header">
                    <span class="quadrant-icon">⚪</span>
                    <h3>Later</h3>
                    <span class="quadrant-count">${quadrants.eliminate.length}</span>
                    <button class="quadrant-clear-btn" data-quadrant="eliminate" title="Clear Quadrant">
                        <i data-lucide="check-check"></i>
                    </button>
                </div>
                <div class="quadrant-tasks" data-droppable="eliminate">
                    ${renderQuadrantTasks(quadrants.eliminate)}
                </div>
            </div>
        </div>
        ${renderEmptyStateIfNeeded(tasks)}
    `;

    setupDragAndDrop();
}

function getEisenhowerQuadrant(task) {
    const priority = task.priority || 0;
    const isUrgent = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const isImportant = priority >= 2;

    if (isUrgent && isImportant) return 'doFirst';
    if (!isUrgent && isImportant) return 'schedule';
    if (isUrgent && !isImportant) return 'delegate';
    return 'eliminate';
}

function renderQuadrantTasks(tasks) {
    const maxVisible = matrixState.focusModeEnabled ? 3 : 10;
    const visibleTasks = tasks.slice(0, maxVisible);
    const hiddenCount = tasks.length - maxVisible;

    if (visibleTasks.length === 0) {
        return '<div class="quadrant-empty">No tasks</div>';
    }

    let html = visibleTasks.map(task => renderTaskCard(task)).join('');

    if (hiddenCount > 0) {
        html += `<button class="show-more-btn" data-count="${hiddenCount}">
            Show ${hiddenCount} more
        </button>`;
    }

    return html;
}


// Task Card Component (Requirement 2.1-2.7)
// Property 3: Status Icon Mapping - validates status icons render correctly
function renderTaskCard(task) {
    const status = getTaskStatus(task);
    const priority = getPriorityLabel(task.priority);
    const energyLevel = task.energyLevel || 'medium';
    const timeOfDay = task.timeOfDay || 'morning';
    const fourthDimValue = matrixState.fourthDimensionType === 'energy' ? energyLevel : timeOfDay;
    const fourthDimIcon = matrixState.fourthDimensionType === 'energy'
        ? ENERGY_ICONS[energyLevel]
        : TIME_ICONS[timeOfDay];

    const isCompleted = status === 'completed';
    const isSkipped = status === 'skipped';
    const isInProgress = status === 'in_progress';
    const tags = task.tags || [];

    // Status labels for accessibility (Requirement 20.2)
    const statusLabels = {
        completed: 'Completed',
        skipped: 'Skipped',
        in_progress: 'In Progress',
        scheduled: 'Scheduled',
        todo: 'To Do'
    };

    // Priority labels for accessibility
    const priorityLabels = {
        high: 'High priority',
        medium: 'Medium priority',
        low: 'Low priority'
    };

    // Fourth dimension labels
    const fourthDimLabels = matrixState.fourthDimensionType === 'energy'
        ? { high: 'High energy', medium: 'Medium energy', low: 'Low energy' }
        : { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

    return `
        <div class="matrix-task-card ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''} priority-${priority}" 
             data-task-id="${task._id || task.id}"
             data-status="${status}"
             data-priority="${priority}"
             draggable="true"
             tabindex="0"
             role="article"
             aria-label="${escapeHtml(task.title)}, ${statusLabels[status]}, ${priorityLabels[priority]}">
            <div class="task-card-status" aria-hidden="true">
                <span class="status-icon ${isInProgress ? 'spinning' : ''}" 
                      role="img" 
                      aria-label="${statusLabels[status]}"
                      data-status="${status}">${STATUS_ICONS[status]}</span>
            </div>
            <div class="task-card-content">
                <div class="task-card-title">${escapeHtml(task.title)}</div>
                ${tags.length > 0 ? `
                    <div class="task-card-tags" aria-label="Tags: ${tags.slice(0, 3).join(', ')}${tags.length > 3 ? ` and ${tags.length - 3} more` : ''}">
                        ${tags.slice(0, 3).map(tag => `<span class="tag-pill" aria-hidden="true">#${escapeHtml(tag)}</span>`).join('')}
                        ${tags.length > 3 ? `<span class="tag-more" aria-hidden="true">+${tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="task-card-meta">
                <span class="fourth-dim-icon" 
                      title="${fourthDimLabels[fourthDimValue]}"
                      role="img"
                      aria-label="${fourthDimLabels[fourthDimValue]}"
                      data-fourth-dim="${fourthDimValue}">${fourthDimIcon}</span>
                ${task.dueDate ? `<span class="due-date" aria-label="Due ${formatDueDate(task.dueDate)}">${formatDueDate(task.dueDate)}</span>` : ''}
            </div>
            <div class="task-card-actions">
                <button class="task-action-btn complete-btn" 
                        data-task-id="${task._id || task.id}" 
                        title="${isCompleted ? 'Reopen task' : 'Complete task'}"
                        aria-label="${isCompleted ? 'Reopen task' : 'Mark task as complete'}">
                    <i data-lucide="${isCompleted ? 'rotate-ccw' : 'check'}"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Get status icon for a given status
 * Used for testing Property 3: Status Icon Mapping
 * @param {string} status - Task status
 * @returns {string} - Status icon
 */
function getStatusIcon(status) {
    return STATUS_ICONS[status] || STATUS_ICONS.todo;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Kanban View (Requirement 5.1-5.8)
function renderKanbanView(container) {
    const tasks = getFilteredTasks();

    // Group tasks by status
    const columns = {
        todo: [],
        in_progress: [],
        scheduled: [],
        completed: [],
        skipped: []
    };

    tasks.forEach(task => {
        const status = getTaskStatus(task);
        if (columns[status]) {
            columns[status].push(task);
        }
    });

    // Sort by priority within each column (Requirement 5.2)
    Object.keys(columns).forEach(key => {
        columns[key].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });

    container.innerHTML = `
        <div class="kanban-board ${matrixState.focusModeEnabled ? 'focus-mode' : ''}">
            ${Object.entries(columns).map(([status, statusTasks]) => `
                <div class="kanban-column" data-status="${status}">
                    <div class="kanban-column-header">
                        <span class="status-icon">${STATUS_ICONS[status]}</span>
                        <h3>${formatStatusLabel(status)}</h3>
                        <span class="column-count">${statusTasks.length}</span>
                    </div>
                    <div class="kanban-column-tasks" data-droppable="${status}">
                        ${renderKanbanTasks(statusTasks)}
                    </div>
                </div>
            `).join('')}
        </div>
        ${renderEmptyStateIfNeeded(tasks)}
    `;

    setupDragAndDrop();
}

function renderKanbanTasks(tasks) {
    const maxVisible = matrixState.focusModeEnabled ? 3 : 15;
    const visibleTasks = tasks.slice(0, maxVisible);
    const hiddenCount = tasks.length - maxVisible;

    if (visibleTasks.length === 0) {
        return '<div class="column-empty">No tasks</div>';
    }

    let html = visibleTasks.map(task => renderTaskCard(task)).join('');

    if (hiddenCount > 0) {
        html += `<button class="show-more-btn" data-count="${hiddenCount}">
            Show ${hiddenCount} more
        </button>`;
    }

    return html;
}

// Smart List View (Requirement 6.1-6.9)
function renderListView(container) {
    let tasks = getFilteredTasks();

    // Auto-sort by composite algorithm (Requirement 6.2)
    tasks = sortTasksByCompositeScore(tasks);

    // Apply hyperfocus limit (Requirement 6.7)
    const maxTasks = matrixState.focusModeEnabled ? 5 : 50;
    const visibleTasks = tasks.slice(0, maxTasks);

    container.innerHTML = `
        <div class="smart-list-view ${matrixState.focusModeEnabled ? 'focus-mode hyperfocus' : ''}">
            <div class="list-controls">
                <div class="sort-control">
                    <label>Sort by:</label>
                    <select id="list-sort-select">
                        <option value="smart">Smart (AI)</option>
                        <option value="priority">Priority</option>
                        <option value="dueDate">Due Date</option>
                        <option value="energy">Energy Match</option>
                    </select>
                </div>
                ${matrixState.focusModeEnabled ? `
                    <div class="hyperfocus-indicator">
                        <i data-lucide="focus"></i>
                        <span>Hyperfocus Mode - Top 5 Tasks</span>
                    </div>
                ` : ''}
            </div>
            <div class="smart-list-tasks">
                ${visibleTasks.map((task, index) => renderListTaskCard(task, index)).join('')}
            </div>
            ${tasks.length > maxTasks ? `
                <button class="show-more-btn" data-count="${tasks.length - maxTasks}">
                    Show ${tasks.length - maxTasks} more tasks
                </button>
            ` : ''}
            ${renderEmptyStateIfNeeded(tasks)}
            <div class="list-summary">
                <span class="summary-stat">
                    <strong>${tasks.filter(t => getPriorityLabel(t.priority) === 'high').length}</strong> high priority
                </span>
                <span class="summary-stat">
                    <strong>${tasks.filter(t => !t.completed).length}</strong> active
                </span>
            </div>
        </div>
    `;
}

function sortTasksByCompositeScore(tasks) {
    const currentHour = new Date().getHours();
    const currentTimeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

    return tasks.sort((a, b) => {
        const scoreA = calculateCompositeScore(a, currentTimeOfDay);
        const scoreB = calculateCompositeScore(b, currentTimeOfDay);
        return scoreB - scoreA;
    });
}

function calculateCompositeScore(task, currentTimeOfDay) {
    let score = 0;

    // Priority weight (0-3)
    score += (task.priority || 0) * 3;

    // Status urgency
    const status = getTaskStatus(task);
    const statusScores = { in_progress: 4, todo: 3, scheduled: 2, completed: 0, skipped: 0 };
    score += statusScores[status] || 0;

    // Energy/Time match
    if (matrixState.fourthDimensionType === 'time_of_day') {
        if (task.timeOfDay === currentTimeOfDay) score += 2;
    }

    // Due date urgency
    if (task.dueDate) {
        const daysUntilDue = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (daysUntilDue <= 0) score += 5;
        else if (daysUntilDue <= 1) score += 3;
        else if (daysUntilDue <= 3) score += 1;
    }

    return score;
}

function renderListTaskCard(task, index) {
    const status = getTaskStatus(task);
    const priority = getPriorityLabel(task.priority);
    const isCompleted = status === 'completed';
    const fourthDimIcon = matrixState.fourthDimensionType === 'energy'
        ? ENERGY_ICONS[task.energyLevel || 'medium']
        : TIME_ICONS[task.timeOfDay || 'morning'];

    return `
        <div class="list-task-card ${isCompleted ? 'completed' : ''} ${matrixState.focusModeEnabled && index === 0 ? 'current-task' : ''}"
             data-task-id="${task._id || task.id}">
            <div class="list-task-priority priority-${priority}"></div>
            <div class="list-task-status">
                <button class="status-toggle-btn" data-task-id="${task._id || task.id}">
                    <span class="status-icon ${status === 'in_progress' ? 'spinning' : ''}">${STATUS_ICONS[status]}</span>
                </button>
            </div>
            <div class="list-task-content">
                <span class="list-task-title">${escapeHtml(task.title)}</span>
                ${task.tags?.length > 0 ? `
                    <div class="list-task-tags">
                        ${task.tags.slice(0, 2).map(tag => `<span class="tag-pill small">#${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="list-task-meta">
                <span class="fourth-dim-badge">${fourthDimIcon}</span>
                ${task.dueDate ? `<span class="due-badge">${formatDueDate(task.dueDate)}</span>` : ''}
            </div>
            <div class="list-task-actions">
                <button class="swipe-action-btn complete-action" data-task-id="${task._id || task.id}" title="Complete">
                    <i data-lucide="check"></i>
                </button>
                <button class="swipe-action-btn skip-action" data-task-id="${task._id || task.id}" title="Skip">
                    <i data-lucide="x"></i>
                </button>
            </div>
        </div>
    `;
}


// Dashboard View (Requirement 7.1-7.6)
function renderDashboardView(container) {
    const tasks = getFilteredTasks();

    // Calculate stats for widgets
    const stats = calculateDashboardStats(tasks);

    container.innerHTML = `
        <div class="dashboard-view ${matrixState.focusModeEnabled ? 'focus-mode' : ''}">
            <div class="dashboard-grid">
                <!-- Priority Distribution Widget -->
                <div class="dashboard-widget widget-2x1">
                    <div class="widget-header">
                        <h4>Priority Distribution</h4>
                    </div>
                    <div class="widget-content">
                        <canvas id="priority-chart"></canvas>
                    </div>
                </div>
                
                <!-- Status Overview Widget -->
                <div class="dashboard-widget widget-2x1">
                    <div class="widget-header">
                        <h4>Status Overview</h4>
                    </div>
                    <div class="widget-content">
                        <canvas id="status-chart"></canvas>
                    </div>
                </div>
                
                <!-- Energy Heatmap Widget -->
                <div class="dashboard-widget widget-2x1">
                    <div class="widget-header">
                        <h4>${matrixState.fourthDimensionType === 'energy' ? 'Energy' : 'Time'} Distribution</h4>
                    </div>
                    <div class="widget-content">
                        <canvas id="energy-chart"></canvas>
                    </div>
                </div>
                
                <!-- Quick Stats Widget -->
                <div class="dashboard-widget widget-1x1">
                    <div class="widget-header">
                        <h4>Quick Stats</h4>
                    </div>
                    <div class="widget-content stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${stats.total}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.completed}</span>
                            <span class="stat-label">Done</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.highPriority}</span>
                            <span class="stat-label">High Priority</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.dueToday}</span>
                            <span class="stat-label">Due Today</span>
                        </div>
                    </div>
                </div>
                
                <!-- Streak Widget -->
                <div class="dashboard-widget widget-1x1 streak-widget">
                    <div class="widget-header">
                        <h4>🔥 Streak</h4>
                    </div>
                    <div class="widget-content">
                        <div class="streak-display">
                            <span class="streak-number">${matrixState.streaks.current}</span>
                            <span class="streak-label">Day Streak</span>
                        </div>
                        <div class="streak-best">Best: ${matrixState.streaks.longest} days</div>
                    </div>
                </div>
            </div>
        </div>
        ${renderEmptyStateIfNeeded(tasks)}
    `;

    // Initialize charts after DOM is ready
    setTimeout(() => initDashboardCharts(stats), 100);
}

function calculateDashboardStats(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
        total: tasks.length,
        completed: tasks.filter(t => getTaskStatus(t) === 'completed').length,
        highPriority: tasks.filter(t => getPriorityLabel(t.priority) === 'high').length,
        dueToday: tasks.filter(t => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            return due >= today && due < tomorrow;
        }).length,
        byPriority: {
            high: tasks.filter(t => getPriorityLabel(t.priority) === 'high').length,
            medium: tasks.filter(t => getPriorityLabel(t.priority) === 'medium').length,
            low: tasks.filter(t => getPriorityLabel(t.priority) === 'low').length
        },
        byStatus: {
            todo: tasks.filter(t => getTaskStatus(t) === 'todo').length,
            in_progress: tasks.filter(t => getTaskStatus(t) === 'in_progress').length,
            scheduled: tasks.filter(t => getTaskStatus(t) === 'scheduled').length,
            completed: tasks.filter(t => getTaskStatus(t) === 'completed').length,
            skipped: tasks.filter(t => getTaskStatus(t) === 'skipped').length
        },
        byEnergy: {
            high: tasks.filter(t => (t.energyLevel || 'medium') === 'high').length,
            medium: tasks.filter(t => (t.energyLevel || 'medium') === 'medium').length,
            low: tasks.filter(t => (t.energyLevel || 'medium') === 'low').length
        }
    };
}

function initDashboardCharts(stats) {
    // Priority Pie Chart
    const priorityCtx = document.getElementById('priority-chart');
    if (priorityCtx && typeof Chart !== 'undefined') {
        new Chart(priorityCtx, {
            type: 'doughnut',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    data: [stats.byPriority.high, stats.byPriority.medium, stats.byPriority.low],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } }
                }
            }
        });
    }

    // Status Bar Chart
    const statusCtx = document.getElementById('status-chart');
    if (statusCtx && typeof Chart !== 'undefined') {
        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['To Do', 'In Progress', 'Scheduled', 'Done', 'Skipped'],
                datasets: [{
                    data: [
                        stats.byStatus.todo,
                        stats.byStatus.in_progress,
                        stats.byStatus.scheduled,
                        stats.byStatus.completed,
                        stats.byStatus.skipped
                    ],
                    backgroundColor: ['#6b7280', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' } },
                    x: { ticks: { color: 'var(--text-secondary)' } }
                }
            }
        });
    }

    // Energy/Time Radar Chart
    const energyCtx = document.getElementById('energy-chart');
    if (energyCtx && typeof Chart !== 'undefined') {
        new Chart(energyCtx, {
            type: 'radar',
            data: {
                labels: matrixState.fourthDimensionType === 'energy'
                    ? ['High 🔥', 'Medium ☕', 'Low 🪫']
                    : ['Morning 🌅', 'Afternoon ☀️', 'Evening 🌙'],
                datasets: [{
                    label: 'Tasks',
                    data: [stats.byEnergy.high, stats.byEnergy.medium, stats.byEnergy.low],
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { color: 'var(--text-secondary)' },
                        pointLabels: { color: 'var(--text-primary)' }
                    }
                }
            }
        });
    }
}

// Empty State (Requirement 23.1-23.6)
function renderEmptyStateIfNeeded(tasks) {
    if (tasks.length > 0) return '';

    const hasFilters = getActiveFilterCount() > 0;

    if (hasFilters) {
        return `
            <div class="matrix-empty-state filtered">
                <div class="empty-icon">🔍</div>
                <h3>No tasks match your filters</h3>
                <p>Try adjusting your filters to see more tasks</p>
                <button class="matrix-btn matrix-btn-primary" id="clear-filters-empty">
                    Clear Filters
                </button>
            </div>
        `;
    }

    return `
        <div class="matrix-empty-state">
            <div class="empty-icon">📝</div>
            <h3>No tasks yet</h3>
            <p>Create your first task to get started with the Task Matrix</p>
            <button class="matrix-btn matrix-btn-primary" id="create-first-task">
                <i data-lucide="plus"></i> Create First Task
            </button>
        </div>
    `;
}


// Event Listeners
function setupMatrixEventListeners() {
    const matrixView = document.getElementById('matrix-view');
    if (!matrixView) return;

    // View switcher
    matrixView.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.matrix-view-btn');
        if (viewBtn) {
            const newView = viewBtn.dataset.view;
            if (newView !== matrixState.currentView) {
                matrixState.currentView = newView;
                saveMatrixPreferences();
                renderMatrixHeader();
                renderCurrentView();
            }
        }

        // Focus mode toggle
        if (e.target.closest('#matrix-focus-toggle')) {
            toggleFocusMode();
        }

        // Fourth dimension toggle
        if (e.target.closest('#matrix-4d-toggle')) {
            toggleFourthDimension();
        }

        // AI Resort button
        if (e.target.closest('#matrix-ai-btn')) {
            showAISuggestions();
        }

        // Filter chips
        const filterChip = e.target.closest('.filter-chip');
        if (filterChip) {
            toggleFilter(filterChip.dataset.filter, filterChip.dataset.value);
        }

        // Clear filters
        if (e.target.closest('#clear-filters-btn') || e.target.closest('#clear-filters-empty')) {
            clearAllFilters();
        }

        // Create first task
        if (e.target.closest('#create-first-task')) {
            if (typeof openTaskModal === 'function') {
                openTaskModal();
            }
        }

        // Task completion
        const completeBtn = e.target.closest('.complete-btn, .complete-action');
        if (completeBtn) {
            const taskId = completeBtn.dataset.taskId;
            toggleTaskCompletion(taskId);
        }

        // Skip task
        const skipBtn = e.target.closest('.skip-action');
        if (skipBtn) {
            const taskId = skipBtn.dataset.taskId;
            skipTask(taskId);
        }

        // Status toggle in list view
        const statusToggle = e.target.closest('.status-toggle-btn');
        if (statusToggle) {
            const taskId = statusToggle.dataset.taskId;
            toggleTaskCompletion(taskId);
        }

        // Task card click (open details)
        const taskCard = e.target.closest('.matrix-task-card, .list-task-card');
        if (taskCard && !e.target.closest('button')) {
            const taskId = taskCard.dataset.taskId;
            if (typeof openTaskModal === 'function') {
                openTaskModal(taskId);
            }
        }

        // Quadrant clear button
        const clearBtn = e.target.closest('.quadrant-clear-btn');
        if (clearBtn) {
            clearQuadrant(clearBtn.dataset.quadrant);
        }

        // Show more button
        const showMoreBtn = e.target.closest('.show-more-btn');
        if (showMoreBtn) {
            // For now, disable focus mode to show all
            if (matrixState.focusModeEnabled) {
                toggleFocusMode();
            }
        }
    });
}

// Toggle Focus Mode (Requirement 10.1-10.6)
function toggleFocusMode() {
    matrixState.focusModeEnabled = !matrixState.focusModeEnabled;
    saveMatrixPreferences();
    renderMatrixHeader();
    renderFilterBar();
    renderCurrentView();

    // Show notification
    if (typeof showToast === 'function') {
        showToast(
            matrixState.focusModeEnabled ? 'Focus Mode enabled - showing top tasks only' : 'Focus Mode disabled',
            'info'
        );
    }
}

// Toggle Fourth Dimension (Requirement 1.7)
function toggleFourthDimension() {
    matrixState.fourthDimensionType = matrixState.fourthDimensionType === 'energy' ? 'time_of_day' : 'energy';
    matrixState.filters.fourthDimension = []; // Clear fourth dimension filters
    saveMatrixPreferences();
    renderMatrixHeader();
    renderFilterBar();
    renderCurrentView();
}

// Filter Management (Requirement 16.6 - real-time filtering with debounce)
function toggleFilter(filterType, value) {
    const filterArray = matrixState.filters[filterType === 'priority' ? 'priorities' :
        filterType === 'status' ? 'statuses' :
            filterType];

    const index = filterArray.indexOf(value);
    if (index > -1) {
        filterArray.splice(index, 1);
    } else {
        filterArray.push(value);
    }

    saveMatrixPreferences();
    renderFilterBar();
    // Apply debounced filter update for real-time filtering (Requirement 16.6)
    debounceFilterUpdate(() => renderCurrentView(), 150);
}

function clearAllFilters() {
    matrixState.filters = {
        priorities: [],
        statuses: [],
        tags: [],
        fourthDimension: []
    };
    saveMatrixPreferences();
    renderFilterBar();
    debounceFilterUpdate(() => renderCurrentView(), 150);
}

// Task Actions
async function toggleTaskCompletion(taskId) {
    const task = state.tasks.find(t => (t._id || t.id) === taskId);
    if (!task) return;

    const currentStatus = getTaskStatus(task);
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';

    try {
        await api.updateTask(taskId, { status: newStatus });

        // Update local state
        task.status = newStatus;
        task.completed = newStatus === 'completed';

        // Trigger celebration if completed (Requirement 9.1)
        if (newStatus === 'completed') {
            triggerCelebration();
            updateStreaks();
        }

        renderCurrentView();

        // Update counts in sidebar
        if (typeof updateCounts === 'function') {
            updateCounts();
        }
    } catch (error) {
        console.error('Failed to update task:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to update task', 'error');
        }
    }
}

async function skipTask(taskId) {
    try {
        await api.updateTask(taskId, { status: 'skipped' });

        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (task) {
            task.status = 'skipped';
        }

        renderCurrentView();

        if (typeof updateCounts === 'function') {
            updateCounts();
        }
    } catch (error) {
        console.error('Failed to skip task:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to skip task', 'error');
        }
    }
}

async function clearQuadrant(quadrant) {
    const tasks = getFilteredTasks();
    const quadrantTasks = tasks.filter(t => getEisenhowerQuadrant(t) === quadrant && getTaskStatus(t) !== 'completed');

    if (quadrantTasks.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No tasks to complete in this quadrant', 'info');
        }
        return;
    }

    // Confirm action
    if (!confirm(`Complete all ${quadrantTasks.length} tasks in this quadrant?`)) {
        return;
    }

    try {
        for (const task of quadrantTasks) {
            await api.updateTask(task._id || task.id, { status: 'completed' });
            task.status = 'completed';
            task.completed = true;
        }

        // Big celebration for clearing quadrant
        triggerCelebration(true);

        renderCurrentView();

        if (typeof updateCounts === 'function') {
            updateCounts();
        }

        if (typeof showToast === 'function') {
            showToast(`🎉 Cleared ${quadrantTasks.length} tasks!`, 'success');
        }
    } catch (error) {
        console.error('Failed to clear quadrant:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to clear quadrant', 'error');
        }
    }
}


// Celebration Effects (Requirement 9.1-9.7)
function triggerCelebration(isBig = false) {
    if (!matrixState.preferences.animationsEnabled) return;

    // Confetti animation
    if (typeof confetti === 'function') {
        const config = isBig ? {
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        } : {
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
        };

        confetti(config);
    }

    // Sound effect (if enabled)
    if (matrixState.preferences.soundEnabled) {
        playCompletionSound();
    }

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
        navigator.vibrate(isBig ? [100, 50, 100] : [50]);
    }
}

function playCompletionSound() {
    // Create a simple completion sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Audio not supported or blocked
    }
}

function updateStreaks() {
    // Simple streak tracking - increment current streak
    const today = new Date().toDateString();
    const lastCompletion = localStorage.getItem('lastCompletionDate');

    if (lastCompletion !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastCompletion === yesterday.toDateString()) {
            matrixState.streaks.current++;
        } else if (lastCompletion !== today) {
            matrixState.streaks.current = 1;
        }

        if (matrixState.streaks.current > matrixState.streaks.longest) {
            matrixState.streaks.longest = matrixState.streaks.current;
        }

        localStorage.setItem('lastCompletionDate', today);
        localStorage.setItem('matrixStreaks', JSON.stringify(matrixState.streaks));
    }
}

// Drag and Drop (Requirement 12.1-12.7)
function setupDragAndDrop() {
    const draggables = document.querySelectorAll('[draggable="true"]');
    const droppables = document.querySelectorAll('[data-droppable]');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', handleDragStart);
        draggable.addEventListener('dragend', handleDragEnd);
    });

    droppables.forEach(droppable => {
        droppable.addEventListener('dragover', handleDragOver);
        droppable.addEventListener('dragleave', handleDragLeave);
        droppable.addEventListener('drop', handleDrop);
    });
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target.closest('.matrix-task-card, .list-task-card');
    if (!draggedElement) return;

    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedElement.dataset.taskId);

    // Add glow effect (Requirement 9.3)
    if (matrixState.preferences.animationsEnabled) {
        draggedElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
    }
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement.style.boxShadow = '';
    }

    // Remove all drop zone highlights
    document.querySelectorAll('.drop-zone-active').forEach(el => {
        el.classList.remove('drop-zone-active');
    });

    draggedElement = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const dropZone = e.target.closest('[data-droppable]');
    if (dropZone) {
        dropZone.classList.add('drop-zone-active');
    }
}

function handleDragLeave(e) {
    const dropZone = e.target.closest('[data-droppable]');
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drop-zone-active');
    }
}

async function handleDrop(e) {
    e.preventDefault();

    const dropZone = e.target.closest('[data-droppable]');
    if (!dropZone || !draggedElement) return;

    dropZone.classList.remove('drop-zone-active');

    const taskId = e.dataTransfer.getData('text/plain');
    const destination = dropZone.dataset.droppable;

    // Determine what property to update based on view
    if (matrixState.currentView === 'kanban') {
        // Update status
        await updateTaskFromDrop(taskId, { status: destination });
    } else if (matrixState.currentView === 'eisenhower') {
        // Update urgency/importance based on quadrant
        const updates = getQuadrantUpdates(destination);
        await updateTaskFromDrop(taskId, updates);
    }
}

async function updateTaskFromDrop(taskId, updates) {
    try {
        await api.updateTask(taskId, updates);

        // Update local state
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (task) {
            Object.assign(task, updates);
        }

        // Animate card into position (Requirement 12.5)
        if (matrixState.preferences.animationsEnabled) {
            renderCurrentView();
        } else {
            renderCurrentView();
        }

        if (typeof updateCounts === 'function') {
            updateCounts();
        }
    } catch (error) {
        console.error('Failed to update task:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to move task', 'error');
        }
    }
}

function getQuadrantUpdates(quadrant) {
    // Map quadrant to priority and urgency
    const updates = {};

    switch (quadrant) {
        case 'doFirst':
            updates.priority = 3; // High
            // Set due date to today if not set (urgent)
            break;
        case 'schedule':
            updates.priority = 3; // High
            break;
        case 'delegate':
            updates.priority = 1; // Low
            break;
        case 'eliminate':
            updates.priority = 0; // None
            break;
    }

    return updates;
}

// Keyboard Shortcuts (Requirement 14.1-14.7)
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts when matrix view is active
        const matrixView = document.getElementById('matrix-view');
        if (!matrixView || matrixView.classList.contains('hidden')) return;

        // Don't handle if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // F - Toggle Focus Mode (Requirement 14.5)
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFocusMode();
        }

        // ? - Show keyboard shortcuts (Requirement 14.6)
        if (e.key === '?') {
            e.preventDefault();
            showKeyboardShortcutsHelp();
        }

        // Ctrl+1-4 - Switch quadrants in Eisenhower view (Requirement 14.1)
        if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
            e.preventDefault();
            if (matrixState.currentView === 'eisenhower') {
                focusQuadrant(parseInt(e.key));
            }
        }

        // Arrow keys - Navigate tasks (Requirement 14.2)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            handleArrowNavigation(e);
        }

        // Space - Toggle completion (Requirement 14.4)
        if (e.key === ' ' && document.activeElement.closest('.matrix-task-card, .list-task-card')) {
            e.preventDefault();
            const taskCard = document.activeElement.closest('.matrix-task-card, .list-task-card');
            if (taskCard) {
                toggleTaskCompletion(taskCard.dataset.taskId);
            }
        }

        // Enter - Open task details (Requirement 14.3)
        if (e.key === 'Enter' && document.activeElement.closest('.matrix-task-card, .list-task-card')) {
            e.preventDefault();
            const taskCard = document.activeElement.closest('.matrix-task-card, .list-task-card');
            if (taskCard && typeof openTaskModal === 'function') {
                openTaskModal(taskCard.dataset.taskId);
            }
        }
    });
}

function showKeyboardShortcutsHelp() {
    const shortcuts = [
        { key: 'F', description: 'Toggle Focus Mode' },
        { key: 'Ctrl+1-4', description: 'Focus quadrant (Eisenhower view)' },
        { key: '↑↓←→', description: 'Navigate between tasks' },
        { key: 'Space', description: 'Toggle task completion' },
        { key: 'Enter', description: 'Open task details' },
        { key: '?', description: 'Show this help' }
    ];

    const html = `
        <div class="keyboard-shortcuts-modal">
            <h3>Keyboard Shortcuts</h3>
            <div class="shortcuts-list">
                ${shortcuts.map(s => `
                    <div class="shortcut-item">
                        <kbd>${s.key}</kbd>
                        <span>${s.description}</span>
                    </div>
                `).join('')}
            </div>
            <button class="matrix-btn matrix-btn-primary" onclick="this.closest('.keyboard-shortcuts-modal').remove()">
                Got it!
            </button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = html;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
}

function focusQuadrant(num) {
    const quadrants = ['doFirst', 'schedule', 'delegate', 'eliminate'];
    const quadrantId = quadrants[num - 1];
    const quadrant = document.querySelector(`[data-quadrant="${quadrantId}"]`);
    if (quadrant) {
        const firstTask = quadrant.querySelector('.matrix-task-card');
        if (firstTask) {
            firstTask.focus();
            firstTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function handleArrowNavigation(e) {
    const currentFocus = document.activeElement;
    const taskCards = Array.from(document.querySelectorAll('.matrix-task-card, .list-task-card'));

    if (taskCards.length === 0) return;

    const currentIndex = taskCards.indexOf(currentFocus);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = currentIndex < taskCards.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : taskCards.length - 1;
    }

    if (nextIndex !== currentIndex || currentIndex === -1) {
        e.preventDefault();
        const nextCard = taskCards[nextIndex >= 0 ? nextIndex : 0];
        nextCard.setAttribute('tabindex', '0');
        nextCard.focus();
    }
}

// AI Suggestions (Requirement 15.1-15.7)
function showAISuggestions() {
    // Placeholder for AI suggestions
    // In a full implementation, this would analyze user patterns

    const suggestions = generateAISuggestions();

    const html = `
        <div class="ai-suggestions-modal">
            <h3><i data-lucide="sparkles"></i> AI Suggestions</h3>
            <div class="suggestions-list">
                ${suggestions.map(s => `
                    <div class="suggestion-item">
                        <p>${s.text}</p>
                        <div class="suggestion-actions">
                            <button class="matrix-btn matrix-btn-primary matrix-btn-small" 
                                    onclick="applyAISuggestion('${s.action}'); this.closest('.modal-overlay').remove();">
                                Apply
                            </button>
                            <button class="matrix-btn matrix-btn-text matrix-btn-small" 
                                    onclick="this.closest('.suggestion-item').remove();">
                                Dismiss
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="matrix-btn matrix-btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                Close
            </button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = html;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function generateAISuggestions() {
    const tasks = state.tasks || [];
    const suggestions = [];

    // Analyze high priority tasks
    const highPriorityIncomplete = tasks.filter(t =>
        getPriorityLabel(t.priority) === 'high' && getTaskStatus(t) !== 'completed'
    );

    if (highPriorityIncomplete.length > 3) {
        suggestions.push({
            text: `You have ${highPriorityIncomplete.length} high-priority tasks. Consider focusing on the top 3 first.`,
            action: 'focusHighPriority'
        });
    }

    // Check for overdue tasks
    const overdue = tasks.filter(t => {
        if (!t.dueDate || getTaskStatus(t) === 'completed') return false;
        return new Date(t.dueDate) < new Date();
    });

    if (overdue.length > 0) {
        suggestions.push({
            text: `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Would you like to reschedule them?`,
            action: 'rescheduleOverdue'
        });
    }

    // Default suggestion
    if (suggestions.length === 0) {
        suggestions.push({
            text: 'Your task list looks well organized! Keep up the great work! 🎉',
            action: 'none'
        });
    }

    return suggestions;
}

function applyAISuggestion(action) {
    switch (action) {
        case 'focusHighPriority':
            matrixState.filters.priorities = ['high'];
            matrixState.focusModeEnabled = true;
            break;
        case 'rescheduleOverdue':
            // Would open a reschedule modal in full implementation
            if (typeof showToast === 'function') {
                showToast('Reschedule feature coming soon!', 'info');
            }
            return;
        case 'none':
        default:
            return;
    }

    saveMatrixPreferences();
    renderMatrixHeader();
    renderFilterBar();
    renderCurrentView();
}

// ============================================
// TASK COMPLETION WITH CELEBRATIONS (Requirement 9.1-9.7)
// ============================================

/**
 * Toggle task completion with celebration effects
 * @param {string} taskId - The task ID to toggle
 */
async function toggleTaskCompletion(taskId) {
    try {
        const task = state.tasks.find(t => (t._id || t.id) === taskId);
        if (!task) return;

        const currentStatus = getTaskStatus(task);
        const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';

        // Optimistic UI update
        task.status = newStatus;
        if (newStatus === 'completed') {
            task.completedAt = new Date().toISOString();
        } else {
            task.completedAt = null;
        }

        // API update
        await api.updateTask(taskId, { status: newStatus });

        // Trigger celebration if completing
        if (newStatus === 'completed') {
            triggerMatrixCelebration(taskId);
            updateStreaks();
        }

        // Re-render
        renderCurrentView();

        if (typeof updateCounts === 'function') {
            updateCounts();
        }

    } catch (error) {
        console.error('Failed to toggle task completion:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to update task', 'error');
        }
    }
}

/**
 * Trigger celebration effects for task completion
 * @param {string} taskId - The completed task ID
 */
function triggerMatrixCelebration(taskId) {
    if (!matrixState.preferences.animationsEnabled) return;

    // Find the task card element for confetti origin
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);

    // Confetti burst (Requirement 9.1)
    if (typeof confetti === 'function') {
        const rect = taskCard?.getBoundingClientRect();
        const origin = rect ? {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
        } : { x: 0.5, y: 0.5 };

        confetti({
            particleCount: 50,
            spread: 60,
            origin: origin,
            colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
            disableForReducedMotion: true
        });
    }

    // Sound effect (Requirement 9.2)
    if (matrixState.preferences.soundEnabled) {
        playCompletionSound();
    }

    // Toast notification
    const dopamineMessages = [
        '🎉 Awesome! Task completed!',
        '⭐ Great job! Keep going!',
        '🔥 You\'re on fire!',
        '💪 One down, you got this!',
        '✨ Crushing it!'
    ];
    const message = dopamineMessages[Math.floor(Math.random() * dopamineMessages.length)];

    if (typeof showToast === 'function') {
        showToast(message, 'success');
    }

    // Haptic feedback for mobile (Requirement 9.6)
    if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
    }
}

/**
 * Play completion sound effect
 */
function playCompletionSound() {
    try {
        // Create a simple pleasant sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
        // Audio context may not be available
    }
}

/**
 * Update streak counters after task completion
 */
function updateStreaks() {
    // Increment current streak
    matrixState.streaks.current++;

    // Update longest streak
    if (matrixState.streaks.current > matrixState.streaks.longest) {
        matrixState.streaks.longest = matrixState.streaks.current;
    }

    // Check for milestone celebrations
    const milestones = [5, 10, 25, 50, 100];
    if (milestones.includes(matrixState.streaks.current)) {
        celebrateMilestone(matrixState.streaks.current);
    }

    saveMatrixPreferences();
}

/**
 * Celebrate streak milestones
 * @param {number} count - The milestone count
 */
function celebrateMilestone(count) {
    if (typeof confetti === 'function') {
        // Bigger celebration for milestones
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
        });
    }

    if (typeof showToast === 'function') {
        showToast(`🏆 ${count}-task streak! You're amazing!`, 'success');
    }
}

/**
 * Clear a quadrant (bulk complete) with celebration
 * @param {string} quadrantId - The quadrant to clear
 */
async function clearQuadrant(quadrantId) {
    const tasks = getFilteredTasks().filter(t => {
        const taskQuadrant = getEisenhowerQuadrant(t);
        return taskQuadrant === quadrantId && getTaskStatus(t) !== 'completed';
    });

    if (tasks.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No tasks to clear!', 'info');
        }
        return;
    }

    // Confirm with user
    if (!confirm(`Complete all ${tasks.length} tasks in this quadrant?`)) {
        return;
    }

    try {
        // Complete all tasks
        for (const task of tasks) {
            await api.updateTask(task._id || task.id, { status: 'completed' });
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
        }

        // Big celebration
        if (typeof confetti === 'function' && matrixState.preferences.animationsEnabled) {
            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']
            });
        }

        if (typeof showToast === 'function') {
            showToast(`🎉 Cleared ${tasks.length} tasks! Incredible!`, 'success');
        }

        matrixState.streaks.current += tasks.length;
        saveMatrixPreferences();
        renderCurrentView();

        if (typeof updateCounts === 'function') {
            updateCounts();
        }

    } catch (error) {
        console.error('Failed to clear quadrant:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to clear quadrant', 'error');
        }
    }
}

// Export for global access
window.taskMatrix = {
    init: initTaskMatrix,
    render: renderCurrentView,
    state: matrixState
};
