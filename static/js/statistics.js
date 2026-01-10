/**
 * NovaDo Statistics Module
 * ADHD-Friendly Analytics Dashboard with AI-Powered Insights
 */

// Statistics State
const statsState = {
    data: null,
    charts: {},
    currentView: 'daily',
    isLoading: false,
    lastFetch: null,
    cacheTimeout: 60000 // 1 minute cache
};

// Initialize Statistics Module
function initStatistics() {
    console.log('[Statistics] Initializing module...');
    setupStatsTabs();
    setupStatsControls();
    loadStatisticsData();
}

// Setup tab navigation
function setupStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            switchStatsView(view);
        });
    });
}

// Setup control buttons
function setupStatsControls() {
    const exportBtn = document.getElementById('stats-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportStats);
    }

    const focusModeBtn = document.getElementById('stats-focus-mode-btn');
    if (focusModeBtn) {
        focusModeBtn.addEventListener('click', toggleFocusMode);
    }

    const celebrateBtn = document.getElementById('celebrate-btn');
    if (celebrateBtn) {
        celebrateBtn.addEventListener('click', triggerCelebration);
    }

    // Mode toggle (simplified/detailed)
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const mode = e.target.dataset.mode;
            toggleDetailMode(mode);
        });
    });
}

// Switch between stats views
function switchStatsView(view) {
    // Update tabs
    document.querySelectorAll('.stats-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
        t.setAttribute('aria-selected', t.dataset.view === view);
    });

    // Update content panels
    document.querySelectorAll('.stats-view-content').forEach(c => {
        c.classList.remove('active');
    });

    const activeContent = document.getElementById(`stats-${view}-view`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    statsState.currentView = view;
    renderStatsView(view);
}

// Load all statistics data
async function loadStatisticsData() {
    // Check cache
    if (statsState.data && statsState.lastFetch &&
        (Date.now() - statsState.lastFetch) < statsState.cacheTimeout) {
        renderStatsView(statsState.currentView);
        return;
    }

    statsState.isLoading = true;
    showStatsLoading(true);

    try {
        const [mainStats, monthlyStats, insights, gamification, focusStats] = await Promise.all([
            api.getStats(),
            api.getMonthlyStats().catch(() => null),
            api.getInsights().catch(() => null),
            api.getGamificationStats().catch(() => null),
            api.getFocusStats().catch(() => null)
        ]);

        statsState.data = {
            ...mainStats,
            monthly: monthlyStats,
            insights: insights,
            gamification: gamification,
            focus: focusStats
        };

        statsState.lastFetch = Date.now();

        // Generate AI insights from data
        statsState.data.aiRecommendations = generateAIRecommendations(statsState.data);

        renderStatsView(statsState.currentView);
    } catch (error) {
        console.error('[Statistics] Failed to load data:', error);
        showStatsError('Failed to load statistics. Please try again.');
    } finally {
        statsState.isLoading = false;
        showStatsLoading(false);
    }
}

// Render the current stats view
function renderStatsView(view) {
    if (!statsState.data) {
        loadStatisticsData();
        return;
    }

    switch (view) {
        case 'daily':
            renderDailySnapshot();
            break;
        case 'weekly':
            renderWeeklyTrends();
            break;
        case 'monthly':
            renderMonthlyAnalytics();
            break;
        case 'gamified':
            renderGamifiedProgress();
            break;
        case 'insights':
            renderInsightsHub();
            break;
        case 'hyperfocus':
            renderHyperfocusMode();
            break;
    }
}

// ============================================
// DAILY SNAPSHOT VIEW
// ============================================
function renderDailySnapshot() {
    const data = statsState.data;

    // Update metric values
    updateElement('daily-focus-time', formatFocusTime(data.focus?.today?.duration || 0));
    updateElement('daily-completed', data.completedToday || 0);
    updateElement('daily-streak', data.streak || 0);

    // Update motivational message
    const motivation = getDailyMotivation(data);
    updateElement('daily-motivation', motivation.message);
    updateElement('daily-avatar', motivation.avatar);

    // Render completion ring
    renderCompletionRing('daily-completed-ring', data.completedToday, 10); // Goal: 10 tasks
}

// ============================================
// WEEKLY TRENDS VIEW
// ============================================
function renderWeeklyTrends() {
    const data = statsState.data;
    const weeklyData = data.weeklyData || [];

    // Line Chart - Task Completion Trend
    renderLineChart('weekly-line-chart', {
        labels: weeklyData.map(d => d.day),
        datasets: [{
            label: 'Tasks Completed',
            data: weeklyData.map(d => d.count),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8
        }]
    });

    // Bar Chart - Focus Hours
    const focusData = generateFocusHoursData(data);
    renderBarChart('weekly-bar-chart', focusData);

    // AI Insights
    renderAIInsights();
}

// ============================================
// MONTHLY ANALYTICS VIEW
// ============================================
function renderMonthlyAnalytics() {
    const data = statsState.data;
    const monthly = data.monthly || {};

    // Update metrics
    updateElement('monthly-focus-hours', `${monthly.totalFocusHours || 0}h`);
    updateElement('monthly-goal-achievement', `${monthly.goalAchievement || 0}%`);

    // Goal achievement chart
    renderDoughnutChart('monthly-goal-chart', {
        achieved: monthly.goalAchievement || 0,
        remaining: 100 - (monthly.goalAchievement || 0)
    });

    // Category breakdown
    if (monthly.categoryBreakdown) {
        renderCategoryChart('monthly-category-chart', monthly.categoryBreakdown);
    }

    // Activity heatmap
    renderActivityHeatmap('monthly-heatmap', data);
}

// ============================================
// GAMIFIED PROGRESS VIEW
// ============================================
function renderGamifiedProgress() {
    const data = statsState.data;
    const gamification = data.gamification || {};

    // Update level and XP
    updateElement('character-level', gamification.level || 1);
    updateElement('gamified-streak', gamification.streak || 0);

    // Render character canvas
    renderCharacterAvatar('character-canvas', gamification.level || 1);

    // Render badges
    renderBadges('badges-grid', gamification.badges || getDefaultBadges());
}

// ============================================
// INSIGHTS HUB VIEW
// ============================================
function renderInsightsHub() {
    const data = statsState.data;

    // Render pattern insights
    const patterns = data.insights?.patterns || {};
    const patternContent = document.getElementById('pattern-insights-content');
    if (patternContent) {
        patternContent.innerHTML = generatePatternInsightsHTML(patterns);
    }

    // Render widget grid with insights
    renderInsightWidgets();
}

// ============================================
// HYPERFOCUS MODE VIEW
// ============================================
function renderHyperfocusMode() {
    const data = statsState.data;

    updateElement('hyperfocus-streak-value', data.streak || 0);

    // Calculate next goal
    const completedToday = data.completedToday || 0;
    const nextGoal = Math.ceil((completedToday + 1) / 5) * 5;
    updateElement('hyperfocus-goal-text', `Next Goal: Complete ${nextGoal} tasks`);

    // Progress bar
    const progress = (completedToday / nextGoal) * 100;
    const progressBar = document.getElementById('hyperfocus-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    }
}

// ============================================
// CHART RENDERING FUNCTIONS
// ============================================

function renderLineChart(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destroy existing chart
    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.raw} tasks completed 🎉`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderBarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Focus Hours',
                data: data.values || [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw.toFixed(1)} hours of focus 🧠`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderDoughnutChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Achieved', 'Remaining'],
            datasets: [{
                data: [data.achieved, data.remaining],
                backgroundColor: ['#22c55e', 'rgba(255, 255, 255, 0.1)'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '75%',
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderCategoryChart(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const colors = generateChartColors(labels.length);

    const ctx = canvas.getContext('2d');
    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'rgba(0, 0, 0, 0.3)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function renderCompletionRing(canvasId, completed, goal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const percentage = Math.min((completed / goal) * 100, 100);
    const ctx = canvas.getContext('2d');

    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [
                    percentage >= 100 ? '#22c55e' : '#6366f1',
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '80%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            rotation: -90,
            circumference: 360
        }
    });
}

// ============================================
// AI RECOMMENDATIONS ENGINE (Rule-Based)
// ============================================

function generateAIRecommendations(data) {
    const recommendations = [];
    const patterns = data.insights?.patterns || {};

    // Streak-based recommendations
    if (data.streak >= 7) {
        recommendations.push({
            type: 'achievement',
            icon: '🔥',
            title: 'Streak Master!',
            message: `Amazing! You've maintained a ${data.streak}-day streak. Keep the momentum going!`,
            priority: 'high'
        });
    } else if (data.streak > 0 && data.completedToday === 0) {
        recommendations.push({
            type: 'alert',
            icon: '⚠️',
            title: 'Streak at Risk!',
            message: `Complete at least 1 task today to maintain your ${data.streak}-day streak!`,
            priority: 'urgent'
        });
    }

    // Productivity pattern insights
    if (patterns.mostProductiveDay) {
        recommendations.push({
            type: 'insight',
            icon: '📊',
            title: 'Peak Performance Day',
            message: `You're most productive on ${patterns.mostProductiveDay}s. Schedule important tasks then!`,
            priority: 'medium'
        });
    }

    // Focus session recommendations
    const focusData = data.focus;
    if (focusData) {
        const todayPomos = focusData.today?.pomos || 0;
        if (todayPomos === 0) {
            recommendations.push({
                type: 'suggestion',
                icon: '🍅',
                title: 'Start a Pomodoro',
                message: 'No focus sessions today. Try a 25-minute Pomodoro to boost productivity!',
                priority: 'medium'
            });
        } else if (todayPomos >= 4) {
            recommendations.push({
                type: 'achievement',
                icon: '🏆',
                title: 'Focus Champion!',
                message: `${todayPomos} Pomodoro sessions completed today. You're on fire!`,
                priority: 'medium'
            });
        }
    }

    // Task completion patterns
    const completedToday = data.completedToday || 0;
    if (completedToday >= 5) {
        recommendations.push({
            type: 'achievement',
            icon: '⭐',
            title: 'Productive Day!',
            message: `You've completed ${completedToday} tasks today. Fantastic work!`,
            priority: 'medium'
        });
    }

    // Pending tasks reminder
    const pendingTasks = data.pendingTasks || 0;
    if (pendingTasks > 10) {
        recommendations.push({
            type: 'suggestion',
            icon: '📝',
            title: 'Consider Prioritizing',
            message: `You have ${pendingTasks} pending tasks. Try breaking them into smaller subtasks.`,
            priority: 'low'
        });
    }

    // Gamification level-up hint
    const gamification = data.gamification;
    if (gamification && gamification.xpToNextLevel <= 20) {
        recommendations.push({
            type: 'achievement',
            icon: '🎮',
            title: 'Almost Level Up!',
            message: `Just ${gamification.xpToNextLevel} XP to reach Level ${gamification.level + 1}!`,
            priority: 'high'
        });
    }

    return recommendations;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatFocusTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getDailyMotivation(data) {
    const completedToday = data.completedToday || 0;
    const streak = data.streak || 0;

    if (completedToday >= 10) {
        return { avatar: '🚀', message: 'Incredible day! You\'re unstoppable!' };
    } else if (completedToday >= 5) {
        return { avatar: '🌟', message: 'Great progress! Keep the momentum!' };
    } else if (completedToday >= 1) {
        return { avatar: '🌱', message: 'Good start! Every task counts!' };
    } else if (streak > 0) {
        return { avatar: '⏰', message: 'Complete a task to keep your streak alive!' };
    } else {
        return { avatar: '💪', message: 'Ready to be productive? Let\'s go!' };
    }
}

function generateFocusHoursData(data) {
    // Generate mock focus hours data based on weekly pattern
    // In production, this would come from actual focus session data
    const weeklyData = data.weeklyData || [];
    return {
        labels: weeklyData.map(d => d.day),
        values: weeklyData.map(d => (d.count * 0.5).toFixed(1)) // Estimate 30min per task
    };
}

function generateChartColors(count) {
    const baseColors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
        '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#06b6d4', '#3b82f6'
    ];
    return baseColors.slice(0, count);
}

function renderAIInsights() {
    const container = document.getElementById('ai-insights-content');
    if (!container) return;

    const recommendations = statsState.data?.aiRecommendations || [];

    if (recommendations.length === 0) {
        container.innerHTML = '<p class="insight-text">Complete more tasks to unlock insights!</p>';
        return;
    }

    container.innerHTML = recommendations.slice(0, 3).map(rec => `
        <div class="insight-item ${rec.type}">
            <span class="insight-icon">${rec.icon}</span>
            <div class="insight-content">
                <strong>${rec.title}</strong>
                <p>${rec.message}</p>
            </div>
        </div>
    `).join('');
}

function generatePatternInsightsHTML(patterns) {
    if (!patterns.mostProductiveDay) {
        return '<p>Complete more tasks to discover your productivity patterns!</p>';
    }

    const dayCompletions = patterns.dayCompletions || {};
    const sortedDays = Object.entries(dayCompletions).sort((a, b) => b[1] - a[1]);

    return `
        <div class="pattern-item">
            <span class="pattern-icon">📅</span>
            <div>
                <strong>Most Productive Day:</strong> ${patterns.mostProductiveDay}
            </div>
        </div>
        <div class="pattern-breakdown">
            ${sortedDays.slice(0, 5).map(([day, count]) => `
                <div class="pattern-bar">
                    <span class="pattern-day">${day}</span>
                    <div class="pattern-progress">
                        <div class="pattern-fill" style="width: ${(count / Math.max(...Object.values(dayCompletions))) * 100}%"></div>
                    </div>
                    <span class="pattern-count">${count}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCharacterAvatar(canvasId, level) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw simple character based on level
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Background glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Character emoji based on level
    const avatars = ['🌱', '🌿', '🌳', '⭐', '🌟', '💫', '🔥', '🚀', '👑', '🏆'];
    const avatarIndex = Math.min(Math.floor((level - 1) / 5), avatars.length - 1);

    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatars[avatarIndex], centerX, centerY);
}

function renderBadges(containerId, badges) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Default badges with earned status
    const allBadges = [
        { id: 'first-task', name: 'First Task', icon: '🎯', earned: false },
        { id: 'streak-7', name: '7 Day Streak', icon: '🔥', earned: false },
        { id: 'streak-30', name: '30 Day Streak', icon: '💎', earned: false },
        { id: 'pomodoro-master', name: 'Pomodoro Master', icon: '🍅', earned: false },
        { id: 'completionist', name: '100 Tasks', icon: '✅', earned: false },
        { id: 'early-bird', name: 'Early Bird', icon: '🌅', earned: false }
    ];

    // Merge earned badges
    badges.forEach(b => {
        const badge = allBadges.find(ab => ab.id === b.id);
        if (badge) badge.earned = b.earned;
    });

    container.innerHTML = allBadges.map(badge => `
        <div class="badge-item ${badge.earned ? 'earned' : 'locked'}">
            <span class="badge-icon">${badge.icon}</span>
            <span class="badge-name">${badge.name}</span>
        </div>
    `).join('');
}

function getDefaultBadges() {
    return [];
}

function renderInsightWidgets() {
    const grid = document.getElementById('insights-widget-grid');
    if (!grid) return;

    const recommendations = statsState.data?.aiRecommendations || [];

    grid.innerHTML = recommendations.map(rec => `
        <div class="insight-widget ${rec.priority}">
            <div class="widget-icon">${rec.icon}</div>
            <div class="widget-content">
                <h4>${rec.title}</h4>
                <p>${rec.message}</p>
            </div>
        </div>
    `).join('');
}

function renderActivityHeatmap(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Generate last 30 days heatmap
    const today = new Date();
    const days = [];

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push({
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 8) // Placeholder - would use actual data
        });
    }

    container.innerHTML = `
        <div class="heatmap-grid">
            ${days.map(day => `
                <div class="heatmap-cell" 
                     data-count="${day.count}" 
                     data-date="${day.date}"
                     style="opacity: ${0.2 + (day.count / 10)}"
                     title="${day.date}: ${day.count} tasks">
                </div>
            `).join('')}
        </div>
        <div class="heatmap-legend">
            <span>Less</span>
            <div class="legend-cells">
                <div class="heatmap-cell" style="opacity: 0.2"></div>
                <div class="heatmap-cell" style="opacity: 0.4"></div>
                <div class="heatmap-cell" style="opacity: 0.6"></div>
                <div class="heatmap-cell" style="opacity: 0.8"></div>
                <div class="heatmap-cell" style="opacity: 1"></div>
            </div>
            <span>More</span>
        </div>
    `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showStatsLoading(show) {
    const container = document.querySelector('.stats-container');
    if (container) {
        container.classList.toggle('loading', show);
    }
}

function showStatsError(message) {
    const container = document.querySelector('.stats-container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'stats-error';
        errorDiv.innerHTML = `<span>⚠️</span> ${message}`;
        container.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function exportStats() {
    const data = statsState.data;
    if (!data) {
        showToast('No data to export', 'error');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        completedToday: data.completedToday,
        completedWeek: data.completedWeek,
        streak: data.streak,
        totalTasks: data.totalTasks,
        completedTasks: data.completedTasks,
        weeklyData: data.weeklyData,
        monthly: data.monthly,
        gamification: data.gamification
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novado-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Statistics exported!', 'success');
}

function toggleFocusMode() {
    const container = document.querySelector('.stats-container');
    if (container) {
        container.classList.toggle('focus-mode');
    }
}

function toggleDetailMode(mode) {
    const container = document.querySelector('.monthly-analytics-container');
    if (container) {
        container.classList.toggle('simplified', mode === 'simplified');
        container.classList.toggle('detailed', mode === 'detailed');
    }
}

function triggerCelebration() {
    // Use canvas-confetti library
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
    showToast('🎉 You deserve this celebration!', 'success');
}

// Expose module globally
window.statisticsModule = {
    init: initStatistics,
    refresh: loadStatisticsData,
    switchView: switchStatsView
};
