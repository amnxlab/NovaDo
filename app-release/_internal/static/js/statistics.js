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
    const tasks = data.tasks || window.state?.tasks || [];

    // Process tasks for analytics
    const analytics = processTasksData(tasks);
    const trends = detectProductivityTrends(analytics);
    const predictions = generatePredictions(tasks, analytics);

    // Render Executive Summary
    renderExecutiveSummary(data, analytics, trends, predictions);

    // Render pattern insights
    const patterns = data.insights?.patterns || {};
    const patternContent = document.getElementById('pattern-insights-content');
    if (patternContent) {
        patternContent.innerHTML = generatePatternInsightsHTML(patterns, trends);
    }

    // Render productivity radar chart
    const radarData = generateRadarData(analytics, { current: data.streak || 0 });
    if (radarData) {
        renderRadarChart('productivity-radar-chart', radarData);
    }

    // Render hourly heatmap
    renderHourlyHeatmap('hourly-heatmap-container', analytics);

    // Render widget grid with insights
    renderInsightWidgets();
}

/**
 * Render Executive Summary - key takeaways in bullet points
 */
function renderExecutiveSummary(data, analytics, trends, predictions) {
    const container = document.getElementById('executive-summary');
    if (!container) return;

    const completedToday = data.completedToday || 0;
    const streak = data.streak || 0;
    const completionRate = analytics?.completionRate || 0;

    // Generate 3-5 key takeaways
    const takeaways = [];

    // Today's performance
    if (completedToday > 0) {
        takeaways.push({
            icon: '✅',
            text: `${completedToday} task${completedToday > 1 ? 's' : ''} completed today`,
            type: 'positive'
        });
    }

    // Streak status
    if (streak >= 3) {
        takeaways.push({
            icon: '🔥',
            text: `${streak}-day streak! Keep it going!`,
            type: 'positive'
        });
    } else if (streak === 0 && completedToday === 0) {
        takeaways.push({
            icon: '💪',
            text: 'Start a new streak today!',
            type: 'neutral'
        });
    }

    // Peak productivity insight
    if (trends?.peakProductivityDay) {
        takeaways.push({
            icon: '📊',
            text: `${trends.peakProductivityDay}s are your most productive days`,
            type: 'insight'
        });
    }

    // At-risk tasks warning
    if (predictions?.atRiskTasks?.length > 0) {
        takeaways.push({
            icon: '⚠️',
            text: `${predictions.atRiskTasks.length} task${predictions.atRiskTasks.length > 1 ? 's' : ''} due soon`,
            type: 'warning'
        });
    }

    // Completion rate
    if (completionRate > 0) {
        takeaways.push({
            icon: '📈',
            text: `${completionRate}% overall completion rate`,
            type: completionRate >= 70 ? 'positive' : 'neutral'
        });
    }

    // Energy insight
    if (trends?.energyInsight) {
        takeaways.push({
            icon: '⚡',
            text: trends.energyInsight.message,
            type: 'insight'
        });
    }

    container.innerHTML = `
        <div class="executive-summary-content">
            <h3 class="summary-title">📋 Today's Summary</h3>
            <ul class="takeaways-list">
                ${takeaways.slice(0, 5).map(t => `
                    <li class="takeaway-item takeaway-${t.type}">
                        <span class="takeaway-icon">${t.icon}</span>
                        <span class="takeaway-text">${t.text}</span>
                    </li>
                `).join('')}
            </ul>
            ${predictions?.suggestedFocus?.length > 0 ? `
                <div class="focus-suggestions">
                    <h4>🎯 Suggested Focus</h4>
                    <ul>
                        ${predictions.suggestedFocus.slice(0, 2).map(t => `
                            <li class="focus-task">${t.title}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
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
// PHASE 3: ENHANCED VISUALIZATIONS
// ============================================

/**
 * Render a Radar Chart for multi-metric overview
 * Great for showing productivity across different dimensions
 */
function renderRadarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');

    // Default data structure for productivity radar
    const chartData = data || {
        labels: ['Focus', 'Completion', 'Consistency', 'Energy', 'Priorities', 'Balance'],
        datasets: [{
            label: 'This Week',
            data: [65, 70, 80, 55, 75, 60],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(99, 102, 241, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
        }]
    };

    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        display: false
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        font: { size: 12, weight: '500' },
                        color: 'var(--text-secondary)'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw}% 📊`
                    }
                }
            }
        }
    });
}

/**
 * Render an hourly productivity heatmap
 * Shows task completion density by hour of day
 */
function renderHourlyHeatmap(containerId, analytics) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get hourly data from analytics or generate placeholder
    const hourlyData = analytics?.byHour || {};
    const maxCount = Math.max(...Object.values(hourlyData), 1);

    // Generate 24-hour grid
    let html = '<div class="hourly-heatmap">';
    html += '<div class="heatmap-labels">';
    html += '<span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span>';
    html += '</div>';
    html += '<div class="heatmap-hours">';

    for (let hour = 0; hour < 24; hour++) {
        const count = hourlyData[hour] || 0;
        const intensity = maxCount > 0 ? (count / maxCount) : 0;
        const opacity = 0.1 + (intensity * 0.8);

        // Color gradient from blue (low) to purple (high)
        const hue = 240 + (intensity * 30); // 240 is blue, 270 is purple
        const bgColor = `hsla(${hue}, 70%, 60%, ${opacity})`;

        const timeLabel = hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`;

        html += `<div class="hour-cell" 
                      style="background: ${bgColor};"
                      data-hour="${hour}"
                      title="${timeLabel}: ${count} tasks completed">
                      ${count > 0 ? count : ''}
                 </div>`;
    }

    html += '</div>';
    html += '<div class="heatmap-legend">';
    html += '<span class="legend-label">Less</span>';
    html += '<div class="legend-gradient"></div>';
    html += '<span class="legend-label">More</span>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render stacked bar chart for status breakdown over time
 */
function renderStackedBarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (statsState.charts[canvasId]) {
        statsState.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');

    // Default weekly data by status
    const chartData = data || {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Completed',
                data: [5, 3, 7, 4, 6, 2, 1],
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderRadius: 4
            },
            {
                label: 'In Progress',
                data: [2, 4, 1, 3, 2, 1, 0],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 4
            },
            {
                label: 'Scheduled',
                data: [3, 2, 4, 2, 3, 1, 2],
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderRadius: 4
            }
        ]
    };

    statsState.charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        footer: (tooltipItems) => {
                            const total = tooltipItems.reduce((sum, item) => sum + item.raw, 0);
                            return `Total: ${total} tasks`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Generate productivity radar data from analytics
 */
function generateRadarData(analytics, streakData) {
    if (!analytics) return null;

    // Calculate metrics (0-100 scale)
    const focusScore = Math.min((analytics.completedTasks / Math.max(analytics.totalTasks, 1)) * 100, 100);
    const completionScore = analytics.completionRate || 0;
    const consistencyScore = Math.min((streakData?.current || 0) * 10, 100);

    // Energy balance (more even distribution = higher score)
    const energyLevels = Object.values(analytics.energyLevels || {});
    const energyDeviation = energyLevels.length > 0
        ? Math.abs(Math.max(...energyLevels.map(e => e.total)) - Math.min(...energyLevels.map(e => e.total)))
        : 0;
    const energyScore = Math.max(100 - (energyDeviation * 5), 0);

    // Priority handling (completing high priority = higher score)
    const highPriorityTotal = analytics.byPriority?.high || 0;
    const priorityScore = highPriorityTotal > 0 ? Math.min(highPriorityTotal * 15, 100) : 50;

    // Work-life balance
    const workScore = 70; // Placeholder - would calculate from tags

    return {
        labels: ['Focus', 'Completion', 'Streaks', 'Energy', 'Priorities', 'Balance'],
        datasets: [{
            label: 'Your Productivity',
            data: [
                Math.round(focusScore),
                Math.round(completionScore),
                Math.round(consistencyScore),
                Math.round(energyScore),
                Math.round(priorityScore),
                workScore
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(99, 102, 241, 1)',
            pointRadius: 4
        }]
    };
}

// ============================================
// AI RECOMMENDATIONS ENGINE (Rule-Based)
// ============================================

/**
 * Generate AI recommendations with ADHD-optimized insights
 * @param {Object} data - Statistics data
 * @returns {Array} Recommendations array
 */
function generateAIRecommendations(data) {
    const recommendations = [];
    const patterns = data.insights?.patterns || {};
    const now = new Date();
    const currentHour = now.getHours();

    // Dopamine-boosting messages array
    const dopamineMessages = [
        "You're doing amazing! 🌟",
        "Every task completed is a win! 🏆",
        "Your future self thanks you! 💪",
        "Progress over perfection! 🚀",
        "You've got this! 💫"
    ];

    // ============================================
    // STREAK & ACHIEVEMENT RECOMMENDATIONS
    // ============================================

    if (data.streak >= 7) {
        recommendations.push({
            type: 'achievement',
            icon: '🔥',
            title: 'Streak Master!',
            message: `Amazing ${data.streak}-day streak! ${dopamineMessages[Math.floor(Math.random() * dopamineMessages.length)]}`,
            priority: 'high',
            category: 'motivation'
        });
    } else if (data.streak > 0 && data.completedToday === 0) {
        recommendations.push({
            type: 'alert',
            icon: '⚠️',
            title: 'Streak at Risk!',
            message: `Complete just 1 task to keep your ${data.streak}-day streak alive!`,
            priority: 'urgent',
            category: 'action',
            actionLabel: 'Start smallest task'
        });
    }

    // ============================================
    // ADHD-SPECIFIC RECOMMENDATIONS
    // ============================================

    // Time-of-day energy matching
    const timeOfDayRecommendations = getTimeOfDayRecommendations(currentHour, data);
    recommendations.push(...timeOfDayRecommendations);

    // Task breakdown suggestion (30+ minute tasks)
    const pendingTasks = data.pendingTasks || 0;
    if (pendingTasks > 10) {
        recommendations.push({
            type: 'adhd-tip',
            icon: '🧩',
            title: 'Break It Down',
            message: `${pendingTasks} pending tasks? Try breaking large tasks into 15-minute chunks. Your brain loves quick wins!`,
            priority: 'medium',
            category: 'adhd'
        });
    }

    // Focus dip alert (3 PM slump)
    if (currentHour >= 14 && currentHour <= 16) {
        recommendations.push({
            type: 'adhd-tip',
            icon: '☕',
            title: 'Afternoon Slump Alert',
            message: 'Energy typically dips around now. Consider a 10-min walk or switch to easier tasks!',
            priority: 'low',
            category: 'adhd'
        });
    }

    // Momentum builder
    const completedToday = data.completedToday || 0;
    if (completedToday === 0 && currentHour >= 9) {
        recommendations.push({
            type: 'adhd-tip',
            icon: '🎯',
            title: 'Quick Win Strategy',
            message: 'Start with your easiest task to build momentum. Just one completion triggers dopamine!',
            priority: 'high',
            category: 'adhd',
            actionLabel: 'Show easiest task'
        });
    } else if (completedToday >= 3 && completedToday < 5) {
        recommendations.push({
            type: 'motivation',
            icon: '⚡',
            title: 'You\'re On a Roll!',
            message: `${completedToday} tasks done! Just ${5 - completedToday} more for a super productive day!`,
            priority: 'medium',
            category: 'motivation'
        });
    } else if (completedToday >= 5) {
        recommendations.push({
            type: 'achievement',
            icon: '🌟',
            title: 'Productivity Star!',
            message: `${completedToday} tasks completed! You've earned a break. Celebrate this win!`,
            priority: 'medium',
            category: 'motivation'
        });
    }

    // ============================================
    // PATTERN-BASED INSIGHTS
    // ============================================

    if (patterns.mostProductiveDay) {
        recommendations.push({
            type: 'insight',
            icon: '📊',
            title: 'Peak Day Detected',
            message: `${patterns.mostProductiveDay}s are your power days! Save challenging tasks for then.`,
            priority: 'medium',
            category: 'insight'
        });
    }

    // ============================================
    // FOCUS SESSION RECOMMENDATIONS
    // ============================================

    const focusData = data.focus;
    if (focusData) {
        const todayPomos = focusData.today?.pomos || 0;
        if (todayPomos === 0 && currentHour >= 9 && currentHour < 17) {
            recommendations.push({
                type: 'suggestion',
                icon: '🍅',
                title: 'Try a Mini Pomodoro',
                message: 'Start with just 15 minutes of focused work. Small wins lead to big momentum!',
                priority: 'medium',
                category: 'action',
                actionLabel: 'Start 15-min focus'
            });
        } else if (todayPomos >= 4) {
            recommendations.push({
                type: 'achievement',
                icon: '🏆',
                title: 'Focus Champion!',
                message: `${todayPomos} Pomodoros done! Your concentration skills are leveling up!`,
                priority: 'medium',
                category: 'motivation'
            });
        }
    }

    // ============================================
    // GAMIFICATION & LEVEL-UP
    // ============================================

    const gamification = data.gamification;
    if (gamification && gamification.xpToNextLevel <= 20) {
        recommendations.push({
            type: 'achievement',
            icon: '🎮',
            title: 'Level Up Incoming!',
            message: `Just ${gamification.xpToNextLevel} XP to Level ${gamification.level + 1}! Complete a few more tasks!`,
            priority: 'high',
            category: 'gamification'
        });
    }

    // ============================================
    // EXECUTIVE FUNCTION SUPPORT
    // ============================================

    // Decision paralysis helper
    if (pendingTasks > 20) {
        recommendations.push({
            type: 'adhd-tip',
            icon: '🎲',
            title: 'Feeling Overwhelmed?',
            message: 'Too many choices can freeze us. Try the "2-minute rule": If it takes <2 min, do it now!',
            priority: 'medium',
            category: 'adhd'
        });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    return recommendations.slice(0, 6); // Limit to 6 to avoid overwhelm
}

/**
 * Get time-of-day specific recommendations
 */
function getTimeOfDayRecommendations(hour, data) {
    const recommendations = [];

    if (hour >= 5 && hour < 9) {
        // Morning - high energy time
        recommendations.push({
            type: 'timing',
            icon: '🌅',
            title: 'Morning Power Hour',
            message: 'Morning is peak focus time for many. Tackle your hardest task now!',
            priority: 'medium',
            category: 'timing'
        });
    } else if (hour >= 9 && hour < 12) {
        // Late morning
        if (data.completedToday === 0) {
            recommendations.push({
                type: 'timing',
                icon: '⏰',
                title: 'Get the Ball Rolling',
                message: 'Morning is slipping away! Start with a 5-minute task to break the inertia.',
                priority: 'high',
                category: 'timing'
            });
        }
    } else if (hour >= 20) {
        // Evening wind-down
        recommendations.push({
            type: 'timing',
            icon: '🌙',
            title: 'Evening Wind-Down',
            message: 'Great time to review tomorrow\'s tasks! Planning now reduces morning anxiety.',
            priority: 'low',
            category: 'timing'
        });
    }

    return recommendations;
}

/**
 * Suggest priority reorder based on patterns
 * @param {Array} tasks - Task array
 * @param {Object} analytics - Processed analytics
 * @returns {Array} Reorder suggestions
 */
function suggestPriorityReorder(tasks, analytics) {
    const suggestions = [];

    if (!tasks || tasks.length === 0 || !analytics) return suggestions;

    const currentHour = new Date().getHours();
    const isHighEnergyTime = currentHour >= 8 && currentHour < 12;
    const isLowEnergyTime = currentHour >= 14 && currentHour < 16;

    // Get active tasks
    const activeTasks = tasks.filter(t =>
        t.status !== 'completed' && t.status !== 'skipped'
    );

    // Find high-energy tasks that should be moved to mornings
    const highEnergyTasks = activeTasks.filter(t =>
        (t.priority || 0) >= 3 || t.energyLevel === 'high'
    );

    if (isHighEnergyTime && highEnergyTasks.length > 0) {
        suggestions.push({
            type: 'reorder',
            message: `${highEnergyTasks.length} high-energy tasks available. Now is the perfect time!`,
            tasks: highEnergyTasks.slice(0, 3).map(t => t.title)
        });
    }

    // Suggest easy tasks for low energy periods
    if (isLowEnergyTime) {
        const easyTasks = activeTasks.filter(t =>
            (t.priority || 0) <= 1 || t.energyLevel === 'low'
        );
        if (easyTasks.length > 0) {
            suggestions.push({
                type: 'reorder',
                message: 'Energy dip time. Here are some lighter tasks:',
                tasks: easyTasks.slice(0, 3).map(t => t.title)
            });
        }
    }

    return suggestions;
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
// PHASE 1: ENHANCED DATA PROCESSING
// ============================================

/**
 * Process tasks data for comprehensive aggregation
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Processed analytics data
 */
function processTasksData(tasks) {
    if (!tasks || tasks.length === 0) {
        return {
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
            byPriority: { high: 0, medium: 0, low: 0 },
            byTag: {},
            byDay: {},
            byHour: {},
            avgCompletionTime: 0,
            energyCorrelation: {}
        };
    }

    const now = new Date();
    const analytics = {
        totalTasks: tasks.length,
        completedTasks: 0,
        skippedTasks: 0,
        inProgressTasks: 0,
        scheduledTasks: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
        byTag: {},
        byDay: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        byHour: {},
        byStatus: { completed: 0, skipped: 0, in_progress: 0, scheduled: 0, todo: 0 },
        completionTimes: [],
        energyLevels: { high: { completed: 0, total: 0 }, medium: { completed: 0, total: 0 }, low: { completed: 0, total: 0 } },
        timeOfDay: { morning: { completed: 0, total: 0 }, afternoon: { completed: 0, total: 0 }, evening: { completed: 0, total: 0 } }
    };

    // Initialize hours
    for (let i = 0; i < 24; i++) {
        analytics.byHour[i] = 0;
    }

    tasks.forEach(task => {
        // Status counts
        const status = task.status || (task.completed ? 'completed' : 'todo');
        if (analytics.byStatus[status] !== undefined) {
            analytics.byStatus[status]++;
        }

        if (status === 'completed') analytics.completedTasks++;
        else if (status === 'skipped') analytics.skippedTasks++;
        else if (status === 'in_progress') analytics.inProgressTasks++;
        else analytics.scheduledTasks++;

        // Priority breakdown
        const priority = getPriorityLabel(task.priority);
        if (analytics.byPriority[priority] !== undefined) {
            analytics.byPriority[priority]++;
        }

        // Tag breakdown
        const tags = task.tags || [];
        tags.forEach(tag => {
            if (!analytics.byTag[tag]) {
                analytics.byTag[tag] = { total: 0, completed: 0 };
            }
            analytics.byTag[tag].total++;
            if (status === 'completed') {
                analytics.byTag[tag].completed++;
            }
        });

        // Day of week analysis (from completion date or due date)
        const dateToUse = task.completedAt || task.dueDate || task.created_at;
        if (dateToUse) {
            const date = new Date(dateToUse);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            analytics.byDay[dayNames[date.getDay()]]++;
            analytics.byHour[date.getHours()]++;
        }

        // Completion time calculation
        if (task.created_at && task.completedAt) {
            const created = new Date(task.created_at);
            const completed = new Date(task.completedAt);
            const hoursToComplete = (completed - created) / (1000 * 60 * 60);
            if (hoursToComplete > 0 && hoursToComplete < 720) { // < 30 days
                analytics.completionTimes.push(hoursToComplete);
            }
        }

        // Energy level correlation
        const energy = task.energyLevel || 'medium';
        if (analytics.energyLevels[energy]) {
            analytics.energyLevels[energy].total++;
            if (status === 'completed') {
                analytics.energyLevels[energy].completed++;
            }
        }

        // Time of day analysis
        const timeOfDay = task.timeOfDay || 'morning';
        if (analytics.timeOfDay[timeOfDay]) {
            analytics.timeOfDay[timeOfDay].total++;
            if (status === 'completed') {
                analytics.timeOfDay[timeOfDay].completed++;
            }
        }
    });

    // Calculate derived metrics
    analytics.completionRate = analytics.totalTasks > 0
        ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100)
        : 0;

    analytics.avgCompletionTime = analytics.completionTimes.length > 0
        ? analytics.completionTimes.reduce((a, b) => a + b, 0) / analytics.completionTimes.length
        : 0;

    // Calculate tag completion rates
    Object.keys(analytics.byTag).forEach(tag => {
        const tagData = analytics.byTag[tag];
        tagData.completionRate = tagData.total > 0
            ? Math.round((tagData.completed / tagData.total) * 100)
            : 0;
    });

    // Calculate energy level completion rates
    Object.keys(analytics.energyLevels).forEach(level => {
        const data = analytics.energyLevels[level];
        data.completionRate = data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0;
    });

    // Calculate time of day completion rates
    Object.keys(analytics.timeOfDay).forEach(time => {
        const data = analytics.timeOfDay[time];
        data.completionRate = data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0;
    });

    return analytics;
}

/**
 * Get priority label from numeric or string value
 */
function getPriorityLabel(priority) {
    if (typeof priority === 'number') {
        return priority >= 3 ? 'high' : priority >= 2 ? 'medium' : 'low';
    }
    return priority || 'low';
}

/**
 * Detect productivity trends and patterns
 * @param {Object} analytics - Processed analytics data
 * @returns {Object} Detected patterns
 */
function detectProductivityTrends(analytics) {
    const patterns = {
        peakProductivityDay: null,
        peakProductivityHour: null,
        bestPerformingTags: [],
        worstPerformingTags: [],
        energyInsight: null,
        timeOfDayInsight: null,
        categoryBalance: 'balanced',
        streakRisk: false,
        recommendations: []
    };

    if (!analytics || analytics.totalTasks === 0) {
        return patterns;
    }

    // Find peak productivity day
    const dayEntries = Object.entries(analytics.byDay);
    if (dayEntries.length > 0) {
        patterns.peakProductivityDay = dayEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Find peak productivity hour
    const hourEntries = Object.entries(analytics.byHour);
    if (hourEntries.length > 0) {
        const peakHour = hourEntries.reduce((a, b) => parseInt(a[1]) > parseInt(b[1]) ? a : b)[0];
        patterns.peakProductivityHour = parseInt(peakHour);

        // Categorize peak time
        if (patterns.peakProductivityHour < 12) {
            patterns.peakTimeCategory = 'morning';
        } else if (patterns.peakProductivityHour < 17) {
            patterns.peakTimeCategory = 'afternoon';
        } else {
            patterns.peakTimeCategory = 'evening';
        }
    }

    // Analyze tags
    const tagEntries = Object.entries(analytics.byTag)
        .filter(([_, data]) => data.total >= 3) // At least 3 tasks
        .sort((a, b) => b[1].completionRate - a[1].completionRate);

    if (tagEntries.length >= 2) {
        patterns.bestPerformingTags = tagEntries.slice(0, 3).map(([tag, data]) => ({
            tag,
            rate: data.completionRate
        }));
        patterns.worstPerformingTags = tagEntries.slice(-3).reverse().map(([tag, data]) => ({
            tag,
            rate: data.completionRate
        }));
    }

    // Energy level insight
    const energyEntries = Object.entries(analytics.energyLevels)
        .filter(([_, data]) => data.total > 0)
        .sort((a, b) => b[1].completionRate - a[1].completionRate);

    if (energyEntries.length > 0) {
        const best = energyEntries[0];
        patterns.energyInsight = {
            bestLevel: best[0],
            completionRate: best[1].completionRate,
            message: `You complete ${best[1].completionRate}% of ${best[0]}-energy tasks`
        };
    }

    // Time of day insight
    const timeEntries = Object.entries(analytics.timeOfDay)
        .filter(([_, data]) => data.total > 0)
        .sort((a, b) => b[1].completionRate - a[1].completionRate);

    if (timeEntries.length > 0) {
        const best = timeEntries[0];
        patterns.timeOfDayInsight = {
            bestTime: best[0],
            completionRate: best[1].completionRate,
            message: `${best[0].charAt(0).toUpperCase() + best[0].slice(1)} is your most productive time`
        };
    }

    // Category balance check
    const workTags = ['work', 'project', 'meeting', 'deadline'];
    const personalTags = ['personal', 'health', 'family', 'hobby'];

    let workCount = 0, personalCount = 0;
    Object.entries(analytics.byTag).forEach(([tag, data]) => {
        const lowerTag = tag.toLowerCase();
        if (workTags.some(w => lowerTag.includes(w))) workCount += data.total;
        if (personalTags.some(p => lowerTag.includes(p))) personalCount += data.total;
    });

    if (workCount > personalCount * 3) {
        patterns.categoryBalance = 'work-heavy';
        patterns.recommendations.push({
            type: 'balance',
            message: 'Consider adding more personal/wellness tasks for better work-life balance'
        });
    } else if (personalCount > workCount * 3) {
        patterns.categoryBalance = 'personal-heavy';
    }

    return patterns;
}

/**
 * Generate predictions for task completion
 * @param {Array} tasks - Task array
 * @param {Object} analytics - Processed analytics
 * @returns {Object} Predictions
 */
function generatePredictions(tasks, analytics) {
    const predictions = {
        todayForecast: 0,
        weekForecast: 0,
        atRiskTasks: [],
        suggestedFocus: [],
        completionProbabilities: {}
    };

    if (!tasks || tasks.length === 0) return predictions;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Filter active tasks
    const activeTasks = tasks.filter(t =>
        t.status !== 'completed' && t.status !== 'skipped'
    );

    // Predict today's completion based on historical patterns
    const todaysTasks = activeTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due < tomorrow;
    });

    // Simple prediction: use historical completion rate
    const avgDailyCompletion = analytics?.completedTasks
        ? Math.round(analytics.completedTasks / 7)
        : 3;
    predictions.todayForecast = Math.min(todaysTasks.length, avgDailyCompletion);

    // Week forecast
    const weekTasks = activeTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due < weekEnd;
    });
    predictions.weekForecast = Math.round(weekTasks.length * (analytics?.completionRate || 50) / 100);

    // Identify at-risk tasks (overdue or due soon with low priority)
    predictions.atRiskTasks = activeTasks
        .filter(t => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
            return daysUntilDue <= 1 && (t.priority || 0) < 2;
        })
        .slice(0, 5)
        .map(t => ({
            id: t._id || t.id,
            title: t.title,
            dueDate: t.dueDate,
            risk: 'high'
        }));

    // Suggested focus tasks (high priority, not started)
    predictions.suggestedFocus = activeTasks
        .filter(t => (t.priority || 0) >= 2 && t.status !== 'in_progress')
        .sort((a, b) => {
            const aPriority = a.priority || 0;
            const bPriority = b.priority || 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return 0;
        })
        .slice(0, 3)
        .map(t => ({
            id: t._id || t.id,
            title: t.title,
            priority: getPriorityLabel(t.priority),
            reason: 'High priority task'
        }));

    // Calculate completion probabilities for each task
    activeTasks.forEach(task => {
        let probability = 50; // Base probability

        // Priority boost
        const priority = task.priority || 0;
        probability += priority * 10;

        // Due date urgency
        if (task.dueDate) {
            const daysUntilDue = (new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24);
            if (daysUntilDue <= 1) probability += 20;
            else if (daysUntilDue <= 3) probability += 10;
        }

        // Status boost
        if (task.status === 'in_progress') probability += 25;
        if (task.status === 'scheduled') probability += 10;

        predictions.completionProbabilities[task._id || task.id] = Math.min(probability, 95);
    });

    return predictions;
}

/**
 * Calculate correlation between energy levels and completion
 * @param {Object} analytics - Processed analytics
 * @returns {Object} Correlation data
 */
function calculateCorrelations(analytics) {
    const correlations = {
        energyVsCompletion: {},
        timeVsCompletion: {},
        priorityVsCompletion: {}
    };

    if (!analytics) return correlations;

    // Energy vs Completion
    Object.entries(analytics.energyLevels || {}).forEach(([level, data]) => {
        correlations.energyVsCompletion[level] = {
            total: data.total,
            completed: data.completed,
            rate: data.completionRate || 0
        };
    });

    // Time of Day vs Completion
    Object.entries(analytics.timeOfDay || {}).forEach(([time, data]) => {
        correlations.timeVsCompletion[time] = {
            total: data.total,
            completed: data.completed,
            rate: data.completionRate || 0
        };
    });

    return correlations;
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
