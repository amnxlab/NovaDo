/**
 * Statistics Page - ADHD-Friendly Stats Dashboard
 * Multiple switchable views with gamification and insights
 */

// Stats state
const statsState = {
    currentView: 'daily',
    data: null,
    charts: {},
    focusMode: false,
    cachedData: null
};

// Initialize stats page
function initStats() {
    setupViewSwitcher();
    setupKeyboardShortcuts();
    loadStatsData();
    attachEventListeners();
}

// Setup view switcher tabs
function setupViewSwitcher() {
    const tabs = document.querySelectorAll('.stats-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            switchStatsView(view);
        });
    });
}

// Switch between stats views
function switchStatsView(view) {
    // Update tabs
    document.querySelectorAll('.stats-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.querySelector(`[data-view="${view}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
    }

    // Update content
    document.querySelectorAll('.stats-view-content').forEach(c => {
        c.classList.remove('active');
    });
    const activeContent = document.getElementById(`stats-${view}-view`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    statsState.currentView = view;
    
    // Render view-specific content
    renderStatsView(view);
}

// Render specific view
function renderStatsView(view) {
    if (!statsState.data) {
        loadStatsData().then(() => renderStatsView(view));
        return;
    }

    switch(view) {
        case 'daily':
            renderDailyView();
            break;
        case 'weekly':
            renderWeeklyView();
            break;
        case 'monthly':
            renderMonthlyView();
            break;
        case 'gamified':
            renderGamifiedView();
            break;
        case 'insights':
            renderInsightsView();
            break;
        case 'hyperfocus':
            renderHyperfocusView();
            break;
    }
}

// Load stats data from API
async function loadStatsData() {
    try {
        const [mainStats, monthlyStats, insights, gamification] = await Promise.all([
            api.getStats(),
            api.getMonthlyStats().catch(() => null),
            api.getInsights().catch(() => null),
            api.getGamificationStats().catch(() => null)
        ]);
        
        statsState.data = {
            ...mainStats,
            monthly: monthlyStats,
            insights: insights,
            gamification: gamification
        };
        statsState.cachedData = { ...statsState.data, timestamp: Date.now() };
        return statsState.data;
    } catch (error) {
        console.error('Failed to load stats:', error);
        return null;
    }
}

// Render Daily Snapshot View
function renderDailyView() {
    if (!statsState.data) return;

    const data = statsState.data;
    
    // Update focus time
    const focusTimeEl = document.getElementById('daily-focus-time');
    if (focusTimeEl) {
        const hours = Math.floor((data.pomodoros || 0) * 25 / 60);
        focusTimeEl.textContent = `${hours}h`;
    }

    // Update completed count
    const completedEl = document.getElementById('daily-completed');
    if (completedEl) {
        completedEl.textContent = data.completedToday || 0;
    }

    // Update streak
    const streakEl = document.getElementById('daily-streak');
    if (streakEl) {
        streakEl.textContent = data.streak || 0;
    }

    // Render progress ring
    renderProgressRing('daily-completed-ring', data.completedToday || 0, 10);

    // Update motivational avatar
    updateMotivationalAvatar(data);
}

// Render Weekly Trends View
function renderWeeklyView() {
    if (!statsState.data) return;

    const weeklyData = statsState.data.weeklyData || [];
    
    // Line chart for task completion
    renderLineChart('weekly-line-chart', {
        labels: weeklyData.map(d => d.day),
        data: weeklyData.map(d => d.count),
        label: 'Tasks Completed'
    });

    // Bar chart for focus hours (placeholder - would need focus session data)
    renderBarChart('weekly-bar-chart', {
        labels: weeklyData.map(d => d.day),
        data: weeklyData.map(d => Math.floor((d.count || 0) * 0.5)) // Estimate
    });

    // Load AI insights
    loadAIInsights();
}

// Render Monthly Analytics View
function renderMonthlyView() {
    if (!statsState.data) return;

    const monthly = statsState.data.monthly;
    
    // Update metrics
    const focusHoursEl = document.getElementById('monthly-focus-hours');
    if (focusHoursEl) {
        if (monthly && monthly.totalFocusHours) {
            focusHoursEl.textContent = `${monthly.totalFocusHours}h`;
        } else {
            const totalPomos = statsState.data.pomodoros || 0;
            const hours = Math.floor(totalPomos * 25 / 60);
            focusHoursEl.textContent = `${hours}h`;
        }
    }

    const goalAchievementEl = document.getElementById('monthly-goal-achievement');
    if (goalAchievementEl && monthly && monthly.goalAchievement) {
        goalAchievementEl.textContent = `${monthly.goalAchievement}%`;
    }

    // Render category breakdown
    if (monthly && monthly.categoryBreakdown) {
        renderCategoryChartFromData('monthly-category-chart', monthly.categoryBreakdown);
    } else {
        renderCategoryChart('monthly-category-chart');
    }

    // Render heatmap
    renderHeatmap('monthly-heatmap');
}

// Render Gamified Progress View
function renderGamifiedView() {
    if (!statsState.data) return;

    const data = statsState.data;
    const level = calculateLevel(data);
    
    // Update level
    const levelEl = document.getElementById('character-level');
    if (levelEl) {
        levelEl.textContent = level;
    }

    // Update streak
    const streakEl = document.getElementById('gamified-streak');
    if (streakEl) {
        streakEl.textContent = data.streak || 0;
    }

    // Render character
    renderCharacter('character-canvas', level);

    // Render badges
    renderBadges(data);
}

// Render Custom Insight View
function renderInsightsView() {
    if (!statsState.data) return;

    // Render widgets
    renderInsightWidgets();

    // Load pattern insights
    loadPatternInsights();
}

// Render Hyperfocus Mode View
function renderHyperfocusView() {
    if (!statsState.data) return;

    const data = statsState.data;
    
    // Update streak
    const streakEl = document.getElementById('hyperfocus-streak-value');
    if (streakEl) {
        streakEl.textContent = data.streak || 0;
    }

    // Update goal
    const goalEl = document.getElementById('hyperfocus-goal-text');
    if (goalEl) {
        const nextGoal = (data.completedToday || 0) < 5 ? 5 : (data.completedToday || 0) + 5;
        goalEl.textContent = `Next Goal: Complete ${nextGoal} tasks`;
    }

    // Update progress
    const progressEl = document.getElementById('hyperfocus-progress-bar');
    if (progressEl) {
        const progress = Math.min(100, ((data.completedToday || 0) / 5) * 100);
        progressEl.style.width = `${progress}%`;
    }
}

// Helper: Render progress ring using Chart.js
function renderProgressRing(canvasId, value, max) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destroy existing chart if any
    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const percentage = Math.min(100, (value / max) * 100);
    const isDark = document.documentElement.dataset.theme?.includes('dark');

    statsState.charts[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [
                    isDark ? '#4ADE80' : '#10B981',
                    isDark ? '#1F1F1F' : '#F3F4F6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// Helper: Render line chart
function renderLineChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const isDark = document.documentElement.dataset.theme?.includes('dark');

    statsState.charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.label,
                data: config.data,
                borderColor: isDark ? '#3B82F6' : '#2563EB',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: isDark ? '#A3A3A3' : '#6B7280' },
                    grid: { color: isDark ? '#333333' : '#E5E7EB' }
                },
                x: {
                    ticks: { color: isDark ? '#A3A3A3' : '#6B7280' },
                    grid: { color: isDark ? '#333333' : '#E5E7EB' }
                }
            }
        }
    });
}

// Helper: Render bar chart
function renderBarChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const isDark = document.documentElement.dataset.theme?.includes('dark');

    statsState.charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: config.labels,
            datasets: [{
                label: 'Focus Hours',
                data: config.data,
                backgroundColor: isDark ? '#3B82F6' : '#2563EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: isDark ? '#A3A3A3' : '#6B7280' },
                    grid: { color: isDark ? '#333333' : '#E5E7EB' }
                },
                x: {
                    ticks: { color: isDark ? '#A3A3A3' : '#6B7280' },
                    grid: { color: isDark ? '#333333' : '#E5E7EB' }
                }
            }
        }
    });
}

// Helper: Render category chart
function renderCategoryChart(canvasId) {
    renderCategoryChartFromData(canvasId, { 'Work': 40, 'Personal': 30, 'Health': 20, 'Other': 10 });
}

// Helper: Render category chart from data
function renderCategoryChartFromData(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const isDark = document.documentElement.dataset.theme?.includes('dark');

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const colors = [
        isDark ? '#3B82F6' : '#2563EB',
        isDark ? '#10B981' : '#059669',
        isDark ? '#F59E0B' : '#D97706',
        isDark ? '#8B5CF6' : '#7C3AED',
        isDark ? '#EC4899' : '#DB2777',
        isDark ? '#14B8A6' : '#0D9488'
    ];

    statsState.charts[canvasId] = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: isDark ? '#A3A3A3' : '#6B7280' }
                }
            }
        }
    });
}

// Helper: Render heatmap
function renderHeatmap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    // Generate 30 days of data
    const today = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push({
            date: date,
            count: Math.floor(Math.random() * 10) // Placeholder
        });
    }

    days.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.style.backgroundColor = getHeatmapColor(day.count);
        cell.title = `${day.date.toLocaleDateString()}: ${day.count} tasks`;
        container.appendChild(cell);
    });
}

// Helper: Get heatmap color based on count
function getHeatmapColor(count) {
    const isDark = document.documentElement.dataset.theme?.includes('dark');
    if (count === 0) return isDark ? '#1F1F1F' : '#F3F4F6';
    if (count < 3) return isDark ? '#1E3A5F' : '#DBEAFE';
    if (count < 6) return isDark ? '#1E40AF' : '#93C5FD';
    if (count < 9) return isDark ? '#1D4ED8' : '#60A5FA';
    return isDark ? '#2563EB' : '#3B82F6';
}

// Helper: Calculate level from stats
function calculateLevel(data) {
    const gamification = data.gamification;
    if (gamification && gamification.level) {
        return gamification.level;
    }
    const completions = data.completedTasks || 0;
    const pomodoros = data.pomodoros || 0;
    const streak = data.streak || 0;
    const xp = completions * 10 + pomodoros * 5 + streak * 20;
    return Math.floor(xp / 100) + 1;
}

// Helper: Render character
function renderCharacter(canvasId, level) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simple character representation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 60;

    // Body
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 20, 30, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 10, centerY - 25, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 10, centerY - 25, 5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 15, 15, 0, Math.PI);
    ctx.stroke();
}

// Helper: Render badges
function renderBadges(data) {
    const container = document.getElementById('badges-grid');
    if (!container) return;

    container.innerHTML = '';

    const gamification = data.gamification;
    let badges = [];
    
    if (gamification && gamification.badges) {
        badges = gamification.badges;
    } else {
        // Fallback badges
        badges = [
            { id: 'first-task', name: 'First Task', icon: '🎯', earned: (data.completedTasks || 0) > 0 },
            { id: 'streak-7', name: '7 Day Streak', icon: '🔥', earned: (data.streak || 0) >= 7 },
            { id: 'pomodoro-master', name: 'Pomodoro Master', icon: '🍅', earned: (data.pomodoros || 0) >= 50 },
            { id: 'completionist', name: 'Completionist', icon: '✅', earned: (data.completedTasks || 0) >= 100 }
        ];
    }

    badges.forEach(badge => {
        const badgeEl = document.createElement('div');
        badgeEl.className = `badge ${badge.earned ? 'earned' : 'locked'}`;
        badgeEl.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
        `;
        container.appendChild(badgeEl);
    });
}

// Helper: Update motivational avatar
function updateMotivationalAvatar(data) {
    const avatarEl = document.getElementById('daily-avatar');
    const motivationEl = document.getElementById('daily-motivation');

    if (!avatarEl || !motivationEl) return;

    const completions = data.completedToday || 0;
    const streak = data.streak || 0;

    // Avatar based on progress
    if (completions >= 10) {
        avatarEl.textContent = '🌳';
        motivationEl.textContent = 'Amazing work!';
    } else if (completions >= 5) {
        avatarEl.textContent = '🌿';
        motivationEl.textContent = 'Great progress!';
    } else if (completions > 0) {
        avatarEl.textContent = '🌱';
        motivationEl.textContent = 'Keep going!';
    } else {
        avatarEl.textContent = '🌰';
        motivationEl.textContent = 'Start your day!';
    }
}

// Helper: Load AI insights
async function loadAIInsights() {
    const container = document.getElementById('ai-insights-content');
    if (!container) return;

    const insightsData = statsState.data?.insights;
    if (insightsData && insightsData.insights) {
        container.innerHTML = insightsData.insights.map(insight => 
            `<p class="insight-text">${insight}</p>`
        ).join('');
    } else {
        // Fallback placeholder insights
        const insights = [
            "You're 20% more productive on Tuesdays—schedule key tasks then!",
            "Your focus peaks at 10 AM—plan important work during that time.",
            "You complete more tasks when you start with a Pomodoro session."
        ];
        container.innerHTML = insights.map(insight => 
            `<p class="insight-text">${insight}</p>`
        ).join('');
    }
}

// Helper: Render insight widgets with drag-and-drop support
function renderInsightWidgets() {
    const container = document.getElementById('insights-widget-grid');
    if (!container) return;

    // Load saved widget configuration
    const savedConfig = localStorage.getItem('insightWidgetConfig');
    let widgetConfig = savedConfig ? JSON.parse(savedConfig) : [
        { id: 'habit-tracker', title: 'Habit Tracker', type: 'chart', enabled: true },
        { id: 'pomodoro-stats', title: 'Pomodoro Stats', type: 'stats', enabled: true },
        { id: 'focus-analysis', title: 'Focus Time Analysis', type: 'analysis', enabled: true }
    ];

    container.innerHTML = '';
    
    widgetConfig.filter(w => w.enabled).forEach(widget => {
        const widgetEl = document.createElement('div');
        widgetEl.className = 'insight-widget';
        widgetEl.draggable = true;
        widgetEl.dataset.widgetId = widget.id;
        
        // Widget header with drag handle
        const header = document.createElement('div');
        header.className = 'widget-header';
        header.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <h4>${widget.title}</h4>
            <button class="widget-config-btn" onclick="configureWidget('${widget.id}')">⚙️</button>
        `;
        widgetEl.appendChild(header);
        
        // Widget content
        const content = document.createElement('div');
        content.className = 'widget-content';
        
        switch(widget.type) {
            case 'chart':
                content.innerHTML = '<canvas id="habit-tracker-chart"></canvas>';
                break;
            case 'stats':
                content.innerHTML = `
                    <div class="pomo-stats-widget">
                        <div class="pomo-stat">Today: ${statsState.data?.pomodoros || 0}</div>
                        <div class="pomo-stat">Total: ${statsState.data?.totalPomodoros || 0}</div>
                    </div>
                `;
                break;
            case 'analysis':
                content.innerHTML = `
                    <div class="focus-analysis-widget">
                        <div class="focus-stat">Peak Hours: 9-11 AM</div>
                        <div class="focus-stat">Avg Session: 25min</div>
                    </div>
                `;
                break;
        }
        
        widgetEl.appendChild(content);
        container.appendChild(widgetEl);
        
        // Add drag event listeners
        widgetEl.addEventListener('dragstart', handleWidgetDragStart);
        widgetEl.addEventListener('dragover', handleWidgetDragOver);
        widgetEl.addEventListener('drop', handleWidgetDrop);
        widgetEl.addEventListener('dragend', handleWidgetDragEnd);
    });
}

// Widget drag and drop handlers
function handleWidgetDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.widgetId);
    e.target.classList.add('dragging');
}

function handleWidgetDragOver(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(e.currentTarget.parentNode, e.clientY);
    
    if (afterElement == null) {
        e.currentTarget.parentNode.appendChild(draggingElement);
    } else {
        e.currentTarget.parentNode.insertBefore(draggingElement, afterElement);
    }
}

function handleWidgetDrop(e) {
    e.preventDefault();
    saveWidgetConfiguration();
}

function handleWidgetDragEnd(e) {
    e.target.classList.remove('dragging');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.insight-widget:not(.dragging)')];
    
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

// Save widget configuration to localStorage
function saveWidgetConfiguration() {
    const container = document.getElementById('insights-widget-grid');
    if (!container) return;
    
    const widgets = [...container.querySelectorAll('.insight-widget')];
    const config = widgets.map((widget, index) => ({
        id: widget.dataset.widgetId,
        order: index,
        enabled: true
    }));
    
    localStorage.setItem('insightWidgetConfig', JSON.stringify(config));
}

// Configure widget (placeholder for future enhancement)
function configureWidget(widgetId) {
    showToast(`Configure ${widgetId} widget`, 'info');
}

// Helper: Load pattern insights
async function loadPatternInsights() {
    const container = document.getElementById('pattern-insights-content');
    if (!container) return;

    const insightsData = statsState.data?.insights;
    if (insightsData && insightsData.insights) {
        container.innerHTML = insightsData.insights.map(insight => 
            `<p>${insight}</p>`
        ).join('');
    } else {
        // Fallback placeholder
        container.innerHTML = `
            <p>Your focus dips at 3 PM—suggest a break timer.</p>
            <p>You're most productive in the morning—schedule important tasks then.</p>
        `;
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const key = e.key;
            if (key >= '1' && key <= '6') {
                const views = ['daily', 'weekly', 'monthly', 'gamified', 'insights', 'hyperfocus'];
                const viewIndex = parseInt(key) - 1;
                if (views[viewIndex]) {
                    e.preventDefault();
                    switchStatsView(views[viewIndex]);
                }
            }
        }
    });
}

// Attach event listeners
function attachEventListeners() {
    // Export button
    const exportBtn = document.getElementById('stats-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportStats);
    }

    // Focus mode toggle
    const focusModeBtn = document.getElementById('stats-focus-mode-btn');
    if (focusModeBtn) {
        focusModeBtn.addEventListener('click', toggleFocusMode);
    }

    // Celebrate button
    const celebrateBtn = document.getElementById('celebrate-btn');
    if (celebrateBtn) {
        celebrateBtn.addEventListener('click', celebrate);
    }

    // Mode toggle for monthly view
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Toggle simplified/detailed mode
        });
    });
}

// Export stats
function exportStats() {
    if (!statsState.data) return;

    const dataStr = JSON.stringify(statsState.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Toggle focus mode
function toggleFocusMode() {
    statsState.focusMode = !statsState.focusMode;
    document.body.classList.toggle('focus-mode', statsState.focusMode);
    
    const btn = document.getElementById('stats-focus-mode-btn');
    if (btn) {
        btn.textContent = statsState.focusMode ? '👁️ Normal Mode' : '👁️ Focus Mode';
    }
}

// Celebrate with confetti
function celebrate() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
    
    showToast('🎉 Celebration time!', 'success');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for stats view to be shown
        const observer = new MutationObserver((mutations) => {
            const statsView = document.getElementById('stats-view');
            if (statsView && !statsView.classList.contains('hidden')) {
                initStats();
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
} else {
    // Check if stats view is already visible
    const statsView = document.getElementById('stats-view');
    if (statsView && !statsView.classList.contains('hidden')) {
        initStats();
    }
}

// Export for use in app.js
window.statsModule = {
    init: initStats,
    switchView: switchStatsView,
    loadData: loadStatsData
};

