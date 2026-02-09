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
        this.sessions = allSessions.map(session => {
            // Ensure date field is set for compatibility
            if (!session.date && session.timestamp) {
                const dateObj = new Date(session.timestamp);
                session.date = dateObj.toISOString().split('T')[0];
            }
            return session;
        }).filter(session => {
            // For now, assume all sessions belong to current user
            // In future, add userId filtering
            return true;
        });
    }

    loadGoals() {
        // Load goals from localStorage settings
        const dailyHours = parseFloat(localStorage.getItem("memoir_goal_daily") || "4");
        const weeklyHours = parseFloat(localStorage.getItem("memoir_goal_weekly") || "20");
        const monthlyHours = parseFloat(localStorage.getItem("memoir_goal_monthly") || "80");
        const totalHours = parseFloat(localStorage.getItem("memoir_goal_total") || "200");

        this.goals = {
            daily: dailyHours * 60 * 60, // Convert hours to seconds
            weekly: weeklyHours * 60 * 60,
            monthly: monthlyHours * 60 * 60,
            total: totalHours * 60 * 60
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
        this.displayRecentBadges();
        this.displayLearningInsights();

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
        const dashboardStartSession = document.getElementById('dashboardStartSession');

        if (quickStartBtn) {
            quickStartBtn.addEventListener('click', () => {
                window.location.href = 'timer.html';
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
        const currentStreak = this.calculateConsecutiveStreak();
        const longestStreak = this.calculateLongestStreak();

        // Update streak counters
        this.updateElement('todayStreak', todayStreak);
        this.updateElement('weekStreak', weekStreak);
        this.updateElement('longestStreak', longestStreak);

        // Update current streak display
        const currentStreakEl = document.getElementById('currentStreakDays');
        const streakFireEl = document.getElementById('streakFire');

        if (currentStreakEl) {
            currentStreakEl.textContent = currentStreak;

            // Animate fire emoji based on streak length
            if (streakFireEl) {
                if (currentStreak >= 7) {
                    streakFireEl.textContent = '🔥🔥🔥';
                    streakFireEl.style.animation = 'pulse 1s infinite';
                } else if (currentStreak >= 3) {
                    streakFireEl.textContent = '🔥🔥';
                    streakFireEl.style.animation = 'pulse 1.5s infinite';
                } else if (currentStreak > 0) {
                    streakFireEl.textContent = '🔥';
                    streakFireEl.style.animation = '';
                } else {
                    streakFireEl.textContent = '💤';
                    streakFireEl.style.animation = '';
                }
            }
        }

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

    calculateConsecutiveStreak() {
        if (this.sessions.length === 0) return 0;

        // Group sessions by date
        const sessionsByDate = {};
        this.sessions.forEach(session => {
            const date = session.date || new Date(session.timestamp).toISOString().split('T')[0];
            if (!sessionsByDate[date]) {
                sessionsByDate[date] = [];
            }
            sessionsByDate[date].push(session);
        });

        // Calculate total time per day
        const dailyTotals = {};
        Object.keys(sessionsByDate).forEach(date => {
            const totalSeconds = sessionsByDate[date].reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
            dailyTotals[date] = totalSeconds;
        });

        // Count consecutive days from today backwards (minimum 30 minutes per day)
        const minSeconds = 30 * 60; // 30 minutes
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) { // Check up to a year back
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            if (dailyTotals[dateStr] && dailyTotals[dateStr] >= minSeconds) {
                streak++;
            } else if (i === 0) {
                // If today has no qualifying session, check yesterday
                continue;
            } else {
                // Streak broken
                break;
            }
        }

        return streak;
    }

    calculateLongestStreak() {
        if (this.sessions.length === 0) return 0;

        // Group sessions by date
        const sessionsByDate = {};
        this.sessions.forEach(session => {
            const date = session.date || new Date(session.timestamp).toISOString().split('T')[0];
            if (!sessionsByDate[date]) {
                sessionsByDate[date] = 0;
            }
            sessionsByDate[date] += session.durationSeconds || 0;
        });

        // Get all dates with qualifying sessions (30+ minutes)
        const minSeconds = 30 * 60;
        const qualifyingDates = Object.keys(sessionsByDate)
            .filter(date => sessionsByDate[date] >= minSeconds)
            .sort();

        if (qualifyingDates.length === 0) return 0;

        // Find longest consecutive streak
        let longestStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < qualifyingDates.length; i++) {
            const prevDate = new Date(qualifyingDates[i - 1]);
            const currDate = new Date(qualifyingDates[i]);
            const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        return longestStreak;
    }

    updateWeeklyCalendar() {
        const calendarEl = document.getElementById('weeklyCalendar');
        if (!calendarEl) return;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();

        calendarEl.innerHTML = '';

        days.forEach((day, index) => {
            const dayEl = document.createElement('span');
            const studyData = this.getStudyDataForDay(index);
            const isToday = index === today;
            const isFuture = this.isFutureDay(index);

            let icon = '';
            let iconClass = '';
            let title = `${day}`;

            if (isFuture) {
                icon = 'bi-circle';
                iconClass = 'text-muted';
                title += ' - Future';
            } else if (studyData.hasActivity) {
                icon = 'bi-check-circle-fill';
                iconClass = 'text-success';
                title += ` - ${this.formatTime(studyData.totalTime)} studied`;
            } else {
                icon = 'bi-x-circle';
                iconClass = 'text-danger';
                title += ' - No activity';
            }

            if (isToday) {
                dayEl.style.fontWeight = 'bold';
            }

            dayEl.innerHTML = `${day}<br><i class="bi ${icon} ${iconClass}" title="${title}"></i>`;
            dayEl.style.cursor = 'pointer';
            dayEl.title = title;
            calendarEl.appendChild(dayEl);
        });
    }

    getStudyDataForDay(dayIndex) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - (now.getDay() - dayIndex));
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const daySessions = this.sessions.filter(s => s.date === targetDateStr);
        const totalTime = daySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const hasActivity = totalTime >= 30 * 60; // At least 30 minutes

        return { hasActivity, totalTime, sessionCount: daySessions.length };
    }

    isFutureDay(dayIndex) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - (now.getDay() - dayIndex));
        return targetDate > now;
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

        const periodSessions = this.sessions.filter(s => {
            // Use timestamp if available (in milliseconds), otherwise try to parse date
            let sessionDate;
            if (s.timestamp) {
                sessionDate = new Date(s.timestamp);
            } else if (s.date) {
                sessionDate = new Date(s.date);
            } else if (s.createdAt) {
                sessionDate = new Date(s.createdAt);
            } else {
                return false;
            }

            return sessionDate >= startDate;
        });

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
            quoteEl.textContent = randomQuote;
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
            .sort(([, a], [, b]) => a.time - b.time)[0];

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

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    getProductivityColor(productivity) {
        switch (productivity) {
            case 'Focused':
                return 'success';
            case 'Average':
                return 'warning';
            case 'Distracted':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    startSmartTimer() {
        // Navigate to timer with smart settings
        window.location.href = 'timer.html?smart=true';
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    displayRecentBadges() {
        const badgesContainer = document.getElementById('recentBadges');
        if (!badgesContainer) return;

        const earnedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');

        if (earnedBadges.length === 0) {
            badgesContainer.innerHTML = '<span class="text-muted">—</span><span class="text-muted">—</span><span class="text-muted">—</span>';
            return;
        }

        // Get last 3 earned badges sorted by earned date (most recent first)
        const lastBadges = earnedBadges
            .sort((a, b) => (b.earnedAt || 0) - (a.earnedAt || 0))
            .slice(0, 3);

        badgesContainer.innerHTML = lastBadges
            .map(badge => `<span title="${badge.name}" style="cursor: pointer; font-size: 1.3em;">${badge.icon}</span>`)
            .join('');
    }

    displayLearningInsights() {
        if (this.sessions.length === 0) {
            document.getElementById('focusedSubject').textContent = 'Start studying to see insights';
            document.getElementById('peakStudyTime').textContent = '—';
            document.getElementById('productiveSession').textContent = '—';
            document.getElementById('studyConsistency').textContent = '—';
            return;
        }

        // 1. Most Focused Subject (highest average focus score)
        const subjectFocusMap = {};
        this.sessions.forEach(session => {
            const subject = session.subject || 'Unknown';
            if (!subjectFocusMap[subject]) {
                subjectFocusMap[subject] = { totalFocus: 0, count: 0, totalTime: 0 };
            }
            subjectFocusMap[subject].totalFocus += session.focusScore || 0;
            subjectFocusMap[subject].count += 1;
            subjectFocusMap[subject].totalTime += session.durationSeconds || 0;
        });

        const mostFocusedSubject = Object.entries(subjectFocusMap)
            .reduce((best, [subject, data]) => {
                const avgFocus = data.count > 0 ? data.totalFocus / data.count : 0;
                if (avgFocus > (best.avgFocus || 0)) {
                    return { subject, avgFocus };
                }
                return best;
            }, {});

        document.getElementById('focusedSubject').textContent =
            mostFocusedSubject.subject ? `${mostFocusedSubject.subject} (${Math.round(mostFocusedSubject.avgFocus)}%)` : '—';

        // 2. Peak Study Time (most sessions at which hour)
        const hourMap = {};
        this.sessions.forEach(session => {
            if (!session.timestamp) return;
            const hour = new Date(session.timestamp).getHours();
            hourMap[hour] = (hourMap[hour] || 0) + 1;
        });

        const peakHour = Object.entries(hourMap).reduce((best, [hour, count]) =>
            count > best.count ? { hour: parseInt(hour), count } : best,
            { hour: null, count: 0 }
        );

        const peakTimeText = peakHour.hour !== null
            ? `${String(peakHour.hour).padStart(2, '0')}:00 - ${String(peakHour.hour + 1).padStart(2, '0')}:00`
            : '—';
        document.getElementById('peakStudyTime').textContent = peakTimeText;

        // 3. Most Productive Session (highest focus score session)
        const mostProductive = this.sessions.reduce((best, session) => {
            const sessionFocus = session.focusScore || 0;
            return sessionFocus > (best.focusScore || 0) ? session : best;
        }, {});

        const productiveText = mostProductive.subject
            ? `${mostProductive.subject} (${mostProductive.focusScore}% focus)`
            : '—';
        document.getElementById('productiveSession').textContent = productiveText;

        // 4. Study Consistency (days with at least 1 hour study)
        const uniqueDays = new Set(this.sessions
            .filter(s => (s.durationSeconds || 0) >= 3600)
            .map(s => s.date)
        ).size;

        const consistencyText = uniqueDays > 0 ? `${uniqueDays} days studied` : 'Not yet started';
        document.getElementById('studyConsistency').textContent = consistencyText;
    }

    showGoalPeriod(period) {
        // Hide all tabs
        document.querySelectorAll('.tab-pane').forEach(el => {
            el.classList.remove('show', 'active');
        });

        // Show selected tab
        const tabEl = document.getElementById(`${period}Goal`);
        if (tabEl) {
            tabEl.classList.add('show', 'active');
        }

        // Update active button
        document.querySelectorAll('.goal-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.goal-tab[data-period="${period}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Animate progress bar
        const barEl = document.getElementById(`${period}ProgressBar`);
        if (barEl) {
            barEl.style.transition = 'none';
            barEl.style.width = '0%';
            setTimeout(() => {
                barEl.style.transition = 'width 1.2s ease';
                barEl.style.width = barEl.style.width; // Trigger reflow
                this.updateGoalProgress(period, this.goals[period]);
            }, 10);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

