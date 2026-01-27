// Enhanced Dashboard Functionality for Athenify
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.sessions = [];
        this.goals = {};
        this.init();
    }

    init() {
        // Get current user
        this.currentUser = auth.getCurrentUser();
        if (!this.currentUser) return;

        // Load data
        this.loadSessions();
        this.loadGoals();
        this.loadUserSettings();

        // Initialize dashboard
        this.initializeDashboard();
        this.updateRealTimeData();
        this.setupEventListeners();
    }

    loadSessions() {
        // Load sessions from localStorage
        const allSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
        // Filter sessions for current user (in a multi-user system)
        this.sessions = allSessions.filter(session => {
            // For now, assume all sessions belong to current user
            // In future, add userId filtering
            return true;
        });
    }

    loadGoals() {
        // Load user goals from settings
        const userGoals = this.currentUser?.settings?.goals || {};
        this.goals = {
            daily: userGoals.daily || 4 * 60 * 60, // 4 hours in seconds
            weekly: userGoals.weekly || 20 * 60 * 60, // 20 hours in seconds
            monthly: userGoals.monthly || 80 * 60 * 60, // 80 hours in seconds
            total: userGoals.total || 200 * 60 * 60 // 200 hours in seconds
        };
    }

    loadUserSettings() {
        // Load user preferences
        this.settings = this.currentUser?.settings || {};
    }

    initializeDashboard() {
        this.updateUserGreeting();
        this.updateStreaks();
        this.updateGoals();
        this.updateFocusScore();
        this.updateRecentActivity();
        this.updateMotivationalQuote();
        this.updateQuickStats();
        this.updateNeedsAttention();

        // Show daily goal by default
        this.showGoalPeriod('daily');
    }

    updateRealTimeData() {
        // Update data every 30 seconds
        setInterval(() => {
            this.loadSessions();
            this.updateStreaks();
            this.updateGoals();
            this.updateFocusScore();
            this.updateRecentActivity();
        }, 30000);
    }

    setupEventListeners() {
        // Quick action buttons
        const quickStartBtn = document.getElementById('quickStartBtn');
        const smartTimerBtn = document.getElementById('smartTimerBtn');
        const dashboardStartSession = document.getElementById('dashboardStartSession');

        if (quickStartBtn) {
            quickStartBtn.addEventListener('click', () => {
                window.location.href = 'timer.html';
            });
        }

        if (smartTimerBtn) {
            smartTimerBtn.addEventListener('click', () => {
                this.startSmartTimer();
            });
        }

        if (dashboardStartSession) {
            dashboardStartSession.addEventListener('click', () => {
                window.location.href = 'timer.html?session=1';
            });
        }

        // Goal tabs - custom implementation since we're not using Bootstrap pills
        const goalTabs = document.querySelectorAll('.goal-tab');
        goalTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const period = tab.dataset.period;
                this.showGoalPeriod(period);
            });
        });
    }

    updateUserGreeting() {
        const greetingEl = document.getElementById('userGreeting');
        if (!greetingEl) return;

        const hour = new Date().getHours();
        let greeting = 'Good morning';

        if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
        else if (hour >= 17) greeting = 'Good evening';

        const name = this.currentUser?.name?.split(' ')[0] || 'Student';
        greetingEl.innerHTML = `${greeting}, ${name}! 👋`;
    }

    updateStreaks() {
        const todayStreak = this.calculateStreak('today');
        const weekStreak = this.calculateStreak('week');
        const monthStreak = this.calculateStreak('month');

        // Update streak counters
        this.updateElement('todayStreak', todayStreak);
        this.updateElement('weekStreak', weekStreak);
        this.updateElement('monthStreak', monthStreak);

        // Update weekly calendar
        this.updateWeeklyCalendar();
    }

    calculateStreak(period) {
        if (this.sessions.length === 0) return 0;

        const now = new Date();
        let days = 0;

        switch (period) {
            case 'today':
                days = 1;
                break;
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
        }

        const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        const recentSessions = this.sessions.filter(s =>
            new Date(s.timestamp || s.date) >= cutoff
        );

        if (recentSessions.length === 0) return 0;

        // Calculate total study time in the period
        const totalMinutes = recentSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60;

        // Return streak based on minimum study time per day
        const minMinutesPerDay = 30; // 30 minutes minimum
        return Math.min(Math.floor(totalMinutes / minMinutesPerDay), days);
    }

    updateWeeklyCalendar() {
        const calendarEl = document.getElementById('weeklyCalendar');
        if (!calendarEl) return;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();

        calendarEl.innerHTML = '';

        days.forEach((day, index) => {
            const dayEl = document.createElement('span');
            const hasActivity = this.hasStudyActivity(index);

            dayEl.innerHTML = `${day}<br><i class="fa-solid ${hasActivity ? 'fa-check text-success' : 'fa-xmark text-danger'}"></i>`;
            calendarEl.appendChild(dayEl);
        });
    }

    hasStudyActivity(dayIndex) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - (now.getDay() - dayIndex));

        const targetDateStr = targetDate.toISOString().split('T')[0];
        return this.sessions.some(s => s.date === targetDateStr);
    }

    updateGoals() {
        const periods = ['daily', 'weekly', 'monthly', 'total'];
        periods.forEach(period => {
            this.updateGoalProgress(period);
        });
    }

    updateGoalProgress(period) {
        const goal = this.goals[period];
        const progress = this.calculateGoalProgress(period, goal);

        const progressEl = document.getElementById(`${period}Progress`);
        const percentageEl = document.getElementById(`${period}Percentage`);
        const barEl = document.getElementById(`${period}ProgressBar`);

        if (progressEl) progressEl.textContent = this.formatTime(progress.actual);
        if (percentageEl) percentageEl.textContent = `${Math.round(progress.percentage)}%`;
        if (barEl) {
            barEl.style.width = '0%';
            setTimeout(() => {
                barEl.style.transition = 'width 1.2s ease';
                barEl.style.width = `${Math.min(progress.percentage, 100)}%`;
            }, 300);
        }
    }

    calculateGoalProgress(period, goalSeconds) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                startDate = weekStart;
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'total':
                // For total, use all time
                startDate = new Date(0);
                break;
        }

        const periodSessions = this.sessions.filter(s =>
            new Date(s.timestamp || s.date) >= startDate
        );

        const actualSeconds = periodSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const percentage = goalSeconds > 0 ? (actualSeconds / goalSeconds) * 100 : 0;

        return {
            actual: actualSeconds,
            target: goalSeconds,
            percentage: Math.min(percentage, 100)
        };
    }

    updateFocusScore() {
        const score = this.calculateFocusScore();
        const scoreEl = document.getElementById('focusScore');
        const changeEl = document.getElementById('focusScoreChange');

        if (scoreEl) scoreEl.textContent = `${score.current}%`;
        if (changeEl) {
            const change = score.current - score.previous;
            const changeClass = change >= 0 ? 'text-success' : 'text-danger';
            const changeIcon = change >= 0 ? '↑' : '↓';
            changeEl.innerHTML = `<small class="${changeClass}">${changeIcon} ${Math.abs(change)}% from last week</small>`;
        }
    }

    calculateFocusScore() {
        if (this.sessions.length === 0) return { current: 0, previous: 0 };

        // Calculate current week focus score
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const currentWeekSessions = this.sessions.filter(s =>
            new Date(s.timestamp || s.date) >= weekStart
        );

        // Calculate previous week
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekSessions = this.sessions.filter(s =>
            new Date(s.timestamp || s.date) >= prevWeekStart &&
            new Date(s.timestamp || s.date) < weekStart
        );

        const currentScore = currentWeekSessions.length > 0
            ? Math.round(currentWeekSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / currentWeekSessions.length)
            : 0;

        const previousScore = prevWeekSessions.length > 0
            ? Math.round(prevWeekSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / prevWeekSessions.length)
            : 0;

        return { current: currentScore, previous: previousScore };
    }

    updateRecentActivity() {
        const activityEl = document.getElementById('recentActivity');
        if (!activityEl) return;

        const recentSessions = this.sessions
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
            .slice(0, 5);

        if (recentSessions.length === 0) {
            activityEl.innerHTML = '<p class="text-muted small">No recent activity</p>';
            return;
        }

        activityEl.innerHTML = recentSessions.map(session => `
            <div class="activity-item d-flex justify-content-between align-items-center mb-2">
                <div>
                    <small class="fw-bold">${session.subject}</small>
                    <br>
                    <small class="text-muted">${this.formatTime(session.durationSeconds)} • ${this.formatDate(session.timestamp || session.date)}</small>
                </div>
                <span class="badge bg-${this.getProductivityColor(session.productivity)}">${session.productivity}</span>
            </div>
        `).join('');
    }

    updateMotivationalQuote() {
        const quotes = [
            "Success is the sum of small efforts, repeated day in and day out.",
            "The only way to do great work is to love what you do.",
            "Believe you can and you're halfway there.",
            "The future belongs to those who believe in the beauty of their dreams.",
            "Your time is limited, so don't waste it living someone else's life.",
            "The way to get started is to quit talking and begin doing.",
            "The expert in anything was once a beginner.",
            "Don't watch the clock; do what it does. Keep going."
        ];

        const quoteEl = document.getElementById('motivationalQuote');
        if (quoteEl) {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteEl.innerHTML = `<i class="fa-solid fa-quote-left text-muted me-2"></i>${randomQuote}<i class="fa-solid fa-quote-right text-muted ms-2"></i>`;
        }
    }

    updateQuickStats() {
        const totalSessions = this.sessions.length;
        const totalTime = this.sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const avgSession = totalSessions > 0 ? totalTime / totalSessions / 60 : 0;

        this.updateElement('totalSessions', totalSessions);
        this.updateElement('totalStudyTime', this.formatTime(totalTime));
        this.updateElement('avgSessionTime', `${Math.round(avgSession)}m`);
    }

    updateNeedsAttention() {
        const attentionEl = document.getElementById('needsAttention');
        if (!attentionEl) return;

        // Find subject with least recent activity
        const subjectStats = {};
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        this.sessions.forEach(session => {
            if (new Date(session.timestamp || session.date) >= lastWeek) {
                const subject = session.subject;
                if (!subjectStats[subject]) {
                    subjectStats[subject] = { sessions: 0, time: 0 };
                }
                subjectStats[subject].sessions++;
                subjectStats[subject].time += session.durationSeconds || 0;
            }
        });

        if (Object.keys(subjectStats).length === 0) {
            attentionEl.innerHTML = '<h5 class="text-muted">No subjects to review</h5><small class="text-muted">Start studying to see insights</small>';
            return;
        }

        const leastStudied = Object.entries(subjectStats)
            .sort(([,a], [,b]) => a.time - b.time)[0];

        if (leastStudied) {
            const [subject, stats] = leastStudied;
            attentionEl.innerHTML = `
                <h5 class="text-warning">${subject}</h5>
                <small class="text-muted">${stats.sessions} sessions, ${this.formatTime(stats.time)}</small>
                <div class="mt-2">
                    <small class="text-muted">Consider reviewing this subject</small>
                </div>
            `;
        }
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.dashboardManager) {
        window.dashboardManager.updateAll();
    }
});

