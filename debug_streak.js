
const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorage = {
    getItem: (key) => {
        // In a real browser this would return string, here we mock it
        // We will read from a file if we can, or just mock the data based on user description
        return null;
    }
};

// Since we can't easily access the user's actual localStorage from here without a browser,
// We will create a test case that SHOULD result in 9 days, and see if our logic produces 9.

// LOGIC TO TEST
function calculateConsecutiveStreak(sessions) {
    if (sessions.length === 0) return 0;

    // Group sessions by date
    const sessionsByDate = {};
    sessions.forEach(session => {
        const date = session.date || new Date(session.timestamp).toISOString().split('T')[0];
        if (!sessionsByDate[date]) {
            sessionsByDate[date] = [];
        }
        sessionsByDate[date].push(session);
    });

    // Helper: Check if a date qualifies as a streak day (Matches Calendar Logic)
    const isStreakDay = (sessions) => {
        if (!sessions || sessions.length === 0) return false;

        const totalMin = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
        const avgFocus = sessions.reduce((a, s) => a + (s.focusScore || 0), 0) / sessions.length;
        const hasFocused = sessions.some(s => s.productivity === "Focused");

        // console.log(`Date stats: Min=${totalMin}, AvgFoc=${avgFocus}, HasFoc=${hasFocused}`);
        return totalMin >= 30 && avgFocus >= 60 && hasFocused;
    };

    let streak = 0;
    const today = new Date(); // We need to mock 'today' to be the day after the streak, or the last day.

    // Let's assume 'today' is the day of the last session for testing purposes, 
    // or we can use a fixed date if we generate fixed data.

    // ALGORITHM FROM DASHBOARD.JS
    const dateKeys = Object.keys(sessionsByDate).sort().reverse();
    if (dateKeys.length === 0) return 0;

    const todayKey = today.toISOString().split('T')[0];

    let consecutive = 0;

    // Loop 365 days back
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dKey = d.toISOString().split('T')[0];

        const isGood = sessionsByDate[dKey] && isStreakDay(sessionsByDate[dKey]);
        // console.log(`Checking ${dKey}: ${isGood}`);

        if (isGood) {
            consecutive++;
        } else {
            if (i === 0) {
                // today failed, continue to yesterday
                continue;
            } else {
                break;
            }
        }
    }
    return consecutive;
}

// GENERATE TEST DATA FOR 9 DAY STREAK
const testSessions = [];
const today = new Date();

// Create 9 days of valid sessions, ending yesterday (so streak is 9)
// Or ending today.
// Let's say inputs 9 days ending TODAY.
for (let i = 0; i < 9; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    testSessions.push({
        date: dateStr,
        timestamp: d.getTime(),
        durationSeconds: 1800 + 60, // 31 mins
        focusScore: 85,
        productivity: "Focused"
    });
}

// Add a gap day 10 days ago
// Day 10 is missing.

// Add another valid day 11 days ago (should not be counted)
const d11 = new Date(today);
d11.setDate(d11.getDate() - 11);
testSessions.push({
    date: d11.toISOString().split('T')[0],
    timestamp: d11.getTime(),
    durationSeconds: 3600,
    focusScore: 90,
    productivity: "Focused"
});

console.log("Testing 9 consecutive days ending today...");
const streak1 = calculateConsecutiveStreak(testSessions);
console.log(`Calculated Streak: ${streak1} (Expected 9)`);

// Test 9 days ending YESTERDAY (today is empty)
const testSessions2 = [];
for (let i = 1; i <= 9; i++) { // Days 1 to 9 ago
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    testSessions2.push({
        date: dateStr,
        timestamp: d.getTime(),
        durationSeconds: 1800 + 60,
        focusScore: 85,
        productivity: "Focused"
    });
}
console.log("\nTesting 9 consecutive days ending yesterday (today empty)...");
const streak2 = calculateConsecutiveStreak(testSessions2);
console.log(`Calculated Streak: ${streak2} (Expected 9)`);

// Test 9 days ending yesterday + Broken today (low score)
const testSessions3 = [...testSessions2];
testSessions3.push({
    date: today.toISOString().split('T')[0],
    timestamp: today.getTime(),
    durationSeconds: 100, // Too short
    focusScore: 20,
    productivity: "Distracted"
});
console.log("\nTesting 9 days ending yesterday + Today exists but invalid...");
const streak3 = calculateConsecutiveStreak(testSessions3);
console.log(`Calculated Streak: ${streak3} (Expected 9)`);

