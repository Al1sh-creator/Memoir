

function debugStreak() {
    const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    console.log(`Total Sessions: ${sessions.length}`);

    // Group by Local Date
    const sessionsByDate = {};
    sessions.forEach(s => {
        const d = new Date(s.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!sessionsByDate[key]) sessionsByDate[key] = [];
        sessionsByDate[key].push(s);
    });

    console.log('Sessions by Date:', sessionsByDate);

    // Check Streak Days
    const today = new Date();
    for (let i = 0; i < 15; i++) { // Check last 15 days
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const daySessions = sessionsByDate[key] || [];

        const totalMin = daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
        const avgFocus = daySessions.length ? daySessions.reduce((a, s) => a + (s.focusScore || 0), 0) / daySessions.length : 0;
        const hasFocused = daySessions.some(s => s.productivity === "Focused");

        const isStreak = totalMin >= 30 && avgFocus >= 60 && hasFocused;

        console.log(`Day ${i} (${key}): ${isStreak ? '✅' : '❌'} | Mins: ${totalMin.toFixed(1)} | Focus: ${avgFocus.toFixed(1)}% | Focused: ${hasFocused}`);
    }
}

debugStreak();
