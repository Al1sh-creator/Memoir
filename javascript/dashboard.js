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
        if (!this.currentUser) return;
        const userId = this.currentUser.id;
        // Load sessions from user-specific localStorage key
        const raw = localStorage.getItem(`memoir_sessions_${userId}`);
        const allSessions = JSON.parse(raw || '[]');

        this.sessions = allSessions.map(session => {
            // Ensure date field is set for compatibility
            if (!session.date && session.timestamp) {
                const dateObj = new Date(session.timestamp);
                session.date = dateObj.toISOString().split('T')[0];
            }
            return session;
        });
    }

    loadGoals() {
        if (!this.currentUser) return;
        const userId = this.currentUser.id;

        // Load goals from user-specific localStorage keys
        const dailyHours = parseFloat(localStorage.getItem(`memoir_goal_daily_${userId}`) || "4");
        const weeklyHours = parseFloat(localStorage.getItem(`memoir_goal_weekly_${userId}`) || "20");
        const monthlyHours = parseFloat(localStorage.getItem(`memoir_goal_monthly_${userId}`) || "80");
        const totalHours = parseFloat(localStorage.getItem(`memoir_goal_total_${userId}`) || "200");

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

        // Goal tabs - custom implementation since we're not using bootstrap pills
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
        const currentStreak = this.calculateConsecutiveStreak();
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

        // Group sessions by date property (matches Calendar logic)
        const sessionsByDate = {};
        this.sessions.forEach(session => {
            // Priority: Use existing session.date (which Calendar uses)
            // Fallback: Calculate from timestamp (Local)
            let dateKey = session.date;

            if (!dateKey) {
                const d = new Date(session.timestamp);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateKey = `${y}-${m}-${day}`;
            }

            if (!sessionsByDate[dateKey]) {
                sessionsByDate[dateKey] = [];
            }
            sessionsByDate[dateKey].push(session);
        });

        // Helper: Check if a date qualifies as a streak day (Matches Calendar Logic)
        const isStreakDay = (sessions) => {
            if (!sessions || sessions.length === 0) return false;

            const totalMin = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
            const avgFocus = sessions.reduce((a, s) => a + (s.focusScore || 0), 0) / sessions.length;
            const hasFocused = sessions.some(s => s.productivity === "Focused");

            return totalMin >= 30 && avgFocus >= 60 && hasFocused;
        };

        let streak = 0;
        const today = new Date();
        // Check "Today" first. If today is NOT a streak day yet, check yesterday to continue streak.
        // If today IS a streak day, count it.

        // Actually, logic: count backwards from today.
        // If today has qualified, day 0 counts. If not, maybe streak is from yesterday.
        // But standard streak logic: if today is incomplete, streak doesn't break until tomorrow.
        // Let's be simple: verify consecutive days starting from yesterday or today.

        // Better Algorithm for Stability:
        // Find the most recent qualifying day. If it's today or yesterday, the streak is alive.
        // Count backwards from there.

        const dateKeys = Object.keys(sessionsByDate).sort().reverse(); // Newest first
        if (dateKeys.length === 0) return 0;

        const todayKey = today.toISOString().split('T')[0];
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        // Check internal streak logic
        // We iterate backwards from today.
        let currentCheck = new Date(today);
        let foundGap = false;

        // Special case: If today isn't qualified yet, we don't kill the streak immediately if yesterday was good.
        // But if we are counting "Consecutive Streak", usually we count qualified days.
        // Let's stick to: Count backwards.

        // Revised Loop:
        let consecutive = 0;

        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            // Use LOCAL date string construction to match Calendar logic
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dKey = `${y}-${m}-${day}`;

            if (sessionsByDate[dKey] && isStreakDay(sessionsByDate[dKey])) {
                if (i === 0) {
                    // Today is good
                    consecutive++;
                } else {
                    // Previous days
                    consecutive++;
                }
            } else {
                if (i === 0) {
                    // Today is NOT good. Streak might be kept by yesterday.
                    // Don't increment, just continue to check yesterday.
                    continue;
                } else {
                    // Break on any other day
                    break;
                }
            }
        }
        return consecutive;
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

        // Update Study Progress & Time Elapsed indicators
        const studyProgressEl = document.getElementById('studyProgressPercent');
        const timeElapsedEl = document.getElementById('timeElapsedPercent');

        // Only update these if we are currently viewing this period's tab
        // But since we update all periods, we need to know which tab is active? 
        // Actually, the simplest way is to check if the current active tab matches 'period'.
        // However, the elements #studyProgressPercent and #timeElapsedPercent are shared outside the tabs.
        // So they should reflect the CURRENTLY ACTIVE tab.
        // But this function loops through ALL periods.

        // Better approach: This function updates the specific goal elements.
        // We should have a separate handler for the shared elements, OR update them only when the tab is active.
        // Let's check if the tab for this period is active.
        const activeTab = document.querySelector(`.goal-tab[data-period="${period}"].active`);
        if (activeTab) {
            if (studyProgressEl) {
                studyProgressEl.textContent = `${Math.round(progress.percentage)}%`;
            }

            if (timeElapsedEl) {
                if (period === 'total') {
                    timeElapsedEl.textContent = '—';
                } else {
                    const elapsed = this.calculateTimeElapsed(period);
                    timeElapsedEl.textContent = `${Math.round(elapsed)}%`;
                }
            }
        }
    }

    calculateTimeElapsed(period) {
        const now = new Date();

        if (period === 'daily') {
            const secondsInDay = 24 * 60 * 60;
            const secondsPassed = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
            return (secondsPassed / secondsInDay) * 100;
        }

        if (period === 'weekly') {
            const dayIndex = now.getDay(); // 0 = Sun, 6 = Sat
            const hours = now.getHours();
            // Calculate total hours passed in the week (assuming Sunday start)
            const totalHours = (dayIndex * 24) + hours + (now.getMinutes() / 60);
            const totalHoursInWeek = 7 * 24;
            return (totalHours / totalHoursInWeek) * 100;
        }

        if (period === 'monthly') {
            const day = now.getDate();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            // Approximation including time of day
            const fraction = (day - 1) + (now.getHours() / 24);
            return (fraction / daysInMonth) * 100;
        }

        return 0;
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

    checkAndAwardBadges() {
        const earnedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');
        const existingIds = new Set(earnedBadges.map(b => b.id));
        const newBadges = [];
        const now = new Date();

        // Helper to award a badge
        const award = (id, name, description, icon) => {
            const userId = this.currentUser.id;
            const earnedBadges = JSON.parse(localStorage.getItem(`memoir_badges_${userId}`) || '[]');
            const existingIds = new Set(earnedBadges.map(b => b.id));

            if (!existingIds.has(id)) {
                newBadges.push({
                    id,
                    name,
                    description,
                    icon,
                    earnedAt: now.toISOString()
                });
                existingIds.add(id);
            }
        };

        // 1. Streak Badges
        const currentStreak = this.calculateConsecutiveStreak();
        if (currentStreak >= 3) award('streak_3', 'Streak Starter', '3-day focus streak', '🔥');
        if (currentStreak >= 7) award('streak_7', 'Streak Master', '7-day focus streak', '⚡');
        if (currentStreak >= 30) award('streak_30', 'Habit Hero', '30-day focus streak', '🏆');

        // 2. Consistency (Unique Days)
        const uniqueDays = new Set(this.sessions.map(s => s.date)).size;
        if (uniqueDays >= 5) award('consistency_5', 'Consistency Champ', 'Study on 5 days', '📅');
        if (uniqueDays >= 14) award('consistency_14', 'Dedicated Learner', 'Study on 14 days', '🛡️');

        // 3. Focus Mastery (Single Session)
        const bestFocus = Math.max(...this.sessions.map(s => s.focusScore || 0), 0);
        if (bestFocus >= 80) award('focus_80', 'Focus Beast', '80%+ focus day', '🧠');
        if (bestFocus >= 90) award('perfect_day', 'Perfect Focus', '90%+ focus session', '✨');

        // 4. Time Milestones
        const maxDuration = Math.max(...this.sessions.map(s => s.durationSeconds || 0), 0);
        if (maxDuration >= 7200) award('deep_worker', 'Deep Worker', '2+ hours in one session', '⏱️');

        // 5. Total Study Time
        const totalHours = this.sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 3600;
        if (totalHours >= 10) award('scholar_10', 'Scholar', '10 hours total study', '🎓');
        if (totalHours >= 50) award('scholar_50', 'Master Scholar', '50 hours total study', '📜');

        // 6. Night Owl (Session after 10 PM)
        const hasNightSession = this.sessions.some(s => {
            if (!s.timestamp) return false;
            const hour = new Date(s.timestamp).getHours();
            return hour >= 22 || hour < 4; // 10 PM - 4 AM
        });
        if (hasNightSession) award('night_owl', 'Night Owl', 'Study late at night', '🦉');

        // 7. Early Bird (Session before 7 AM)
        const hasMorningSession = this.sessions.some(s => {
            if (!s.timestamp) return false;
            const hour = new Date(s.timestamp).getHours();
            return hour >= 4 && hour < 7; // 4 AM - 7 AM
        });
        if (hasMorningSession) award('early_bird', 'Early Bird', 'Study before 7 AM', '🌅');

        // 8. Marathon Day (3+ hours in a single day)
        // Group by date first
        const sessionsByDate = {};
        this.sessions.forEach(s => {
            const d = s.date || 'unknown';
            if (!sessionsByDate[d]) sessionsByDate[d] = 0;
            sessionsByDate[d] += (s.durationSeconds || 0);
        });
        const maxDailySeconds = Math.max(...Object.values(sessionsByDate), 0);
        if (maxDailySeconds >= 3 * 3600) award('marathon_day', 'Marathoner', '3+ hours in one day', '🏃');


        // Save if any new badges
        if (newBadges.length > 0) {
            const userId = this.currentUser.id;
            const earnedBadges = JSON.parse(localStorage.getItem(`memoir_badges_${userId}`) || '[]');
            const updatedBadges = [...earnedBadges, ...newBadges];
            localStorage.setItem(`memoir_badges_${userId}`, JSON.stringify(updatedBadges));

            // Optionally notify user (e.g., via toast or alert)
            // For now, just log and ensure they appear in Recent Medals
            console.log('New Badges Earned:', newBadges);

            // Update Auth/User Stats as well since auth.js syncs badges?
            // auth.js: updateStats({ badges: ... })
            // But auth.js likely reads from its own 'stats' object.
            // Let's sync with auth if possible, but dashboard display uses 'earnedBadges' in localStorage.
        }
    }

    updateNeedsAttention() {
        // Call badge check whenever we update dashboard
        this.checkAndAwardBadges();

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
        if (!badgesContainer || !this.currentUser) return;

        const userId = this.currentUser.id;
        const earnedBadges = JSON.parse(localStorage.getItem(`memoir_badges_${userId}`) || '[]');

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

