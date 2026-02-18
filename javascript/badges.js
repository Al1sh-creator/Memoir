// Load data
const earnedBadges =
    JSON.parse(localStorage.getItem("earnedBadges")) || [];

const sessions =
    JSON.parse(localStorage.getItem("sessions")) || [];

// Helper: calculate focus streak
function calculateFocusStreak(sessions) {
    const byDate = {};
    sessions.forEach(s => {
        if (!byDate[s.date]) byDate[s.date] = [];
        byDate[s.date].push(s);
    });

    const dates = Object.keys(byDate).sort().reverse();
    let streak = 0;

    for (let date of dates) {
        const day = byDate[date];
        const totalMin = day.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
        const avgFocus = day.reduce((a, s) => a + (s.focusScore || 0), 0) / day.length;
        const hasFocused = day.some(s => s.productivity === "Focused");

        if (totalMin >= 30 && avgFocus >= 60 && hasFocused) streak++;
        else break;
    }

    return streak;
}

// Progress logic
function getBadgeProgress(id, sessions) {
    switch (id) {
        case "streak_3":
            return Math.min(calculateFocusStreak(sessions) / 3 * 100, 100);

        case "perfect_day":
            return sessions.some(s => (s.focusScore || 0) >= 90) ? 100 : 0;

        case "deep_worker": //... is spread operator it takes a array and spreads in individual itme
            const max = Math.max(...sessions.map(s => s.durationSeconds || 0));
            return Math.min(max / 7200 * 100, 100); //calculates how close to 2 hour session

        case "consistency_5": // badge for showing on 5 unique days
            const days = [...new Set(sessions.map(s => s.date))];
            return Math.min(days.length / 5 * 100, 100);
        case "streak_7":
            return Math.min(calculateFocusStreak(sessions) / 7 * 100, 100);

        case "focus_80":
            return sessions.some(s => (s.focusScore || 0) >= 80) ? 100 : 0;

        case "night_owl":
            return sessions.some(s => {
                if (!s.timestamp) return false;
                const hour = new Date(s.timestamp).getHours();
                return hour >= 22;
            }) ? 100 : 0;

        case "marathon_day": //study for 3 hours in a day
            const dayTotals = {};
            sessions.forEach(s => {
                dayTotals[s.date] = (dayTotals[s.date] || 0) + (s.durationSeconds || 0);
            });
            return Math.min(
                Math.max(...Object.values(dayTotals)) / 10800 * 100,
                100
            );


        default:
            return 0;
    }
}

// Render badges
document.querySelectorAll(".badge-card").forEach(card => {
    const id = card.dataset.badgeId;
    const RARE_BADGES = ["streak_7", "marathon_day", "consistency_5"];

if (RARE_BADGES.includes(id)) {
  card.classList.add("rare");
}
    const earned = earnedBadges.find(b => b.id === id);

    const status = card.querySelector(".badge-status");
    const bar = card.querySelector(".progress-bar");

    if (earned) {
        card.classList.add("earned");
        status.innerText = "Unlocked";
        status.className = "badge-status text-success";
        bar.style.width = "100%";
    } else {
        card.classList.add("locked");
        status.innerText = "Locked";
        status.className = "badge-status text-muted";
        bar.style.width = `${getBadgeProgress(id, sessions)}%`;
    }
});
