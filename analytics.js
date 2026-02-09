document.addEventListener("DOMContentLoaded", () => {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];

  // ================= EMPTY STATE SAFETY =================
  if (!sessions.length) {
    document.getElementById("totalHours").innerText = "0h";
    document.getElementById("avgSession").innerText = "0%";
    document.getElementById("prodScore").innerText = "0%";
    document.getElementById("streakDays").innerText = "0";
    document.getElementById("suggestionsContainer").innerText =
      "Start studying to unlock insights 📊";
    return;
  }

  // ================= BASIC METRICS =================
  const totalMinutes =
    sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60;

  document.getElementById("totalHours").innerText =
    Math.round(totalMinutes / 60) + "h";

  const avgFocus = Math.round(
    sessions.reduce((a, s) => a + (s.focusScore || 0), 0) /
    sessions.length
  );

  document.getElementById("avgSession").innerText = avgFocus + "%";

  // ================= PRODUCTIVITY SCORE =================
  const productiveSessions =
    sessions.filter(s => s.productivity === "Focused").length;

  const productivityScore =
    Math.round((productiveSessions / sessions.length) * 100);

  document.getElementById("prodScore").innerText =
    productivityScore + "%";

  // ================= STREAK LOGIC =================
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

      const totalMin =
        day.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;

      const dayAvgFocus =
        day.reduce((a, s) => a + (s.focusScore || 0), 0) /
        day.length;

      const hasFocused = day.some(s => s.productivity === "Focused");

      if (totalMin >= 30 && dayAvgFocus >= 60 && hasFocused) streak++;
      else break;
    }
    return streak;
  }

  const streak = calculateFocusStreak(sessions);
  document.getElementById("streakDays").innerText = streak;

  // ================= LAST 7 DAYS STUDY TIME CHART =================
  const today = new Date();
  const last7Days = [];
  // used for setting x axis of the chart
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }
  //used for setting y axis of the chart
  const dailyMinutes = last7Days.map(date =>
    Math.round(
      sessions
        .filter(s => s.date === date)//filter session for this specific date
        .reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60//sum duration in seconds ->Convert to Minutes
    )
  );

  const labels = last7Days.map(d =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short" })//convert date to short weekday
  );

  const timeCtx = document.getElementById("timeChart")?.getContext("2d");

  if (timeCtx) {
    new Chart(timeCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Study Minutes",
          data: dailyMinutes,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // ================= 1️⃣ SUBJECT-WISE FOCUS % =================
  const subjectFocus = {};
  const subjectCount = {};

  sessions.forEach(s => {
    const subject = s.subject || "Unknown";
    subjectFocus[subject] = (subjectFocus[subject] || 0) + (s.focusScore || 0);
    subjectCount[subject] = (subjectCount[subject] || 0) + 1;
  });

  const subjectCtx =
    document.getElementById("subjectChart")?.getContext("2d");

  if (subjectCtx) {
    new Chart(subjectCtx, {
      type: "bar",
      data: {
        labels: Object.keys(subjectFocus),
        datasets: [{
          label: "Avg Focus %",
          data: Object.keys(subjectFocus).map(
            s => Math.round(subjectFocus[s] / subjectCount[s])
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });
  }

  // ================= 2️⃣ WEEK COMPARISON =================
  const now = new Date();
  const startOfToday = new Date(now.toDateString());

  const lastWeek = sessions.filter(s =>
    new Date(s.date) >= new Date(startOfToday - 14 * 86400000) &&
    new Date(s.date) < new Date(startOfToday - 7 * 86400000)
  );

  const thisWeek = sessions.filter(s =>
    new Date(s.date) >= new Date(startOfToday - 7 * 86400000)
  );

  const lastWeekMin =
    lastWeek.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
  const thisWeekMin =
    thisWeek.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;

  const weekComparison =
    thisWeekMin > lastWeekMin
      ? `📈 You studied ${Math.round(thisWeekMin - lastWeekMin)} min more than last week`
      : `📉 You studied ${Math.round(lastWeekMin - thisWeekMin)} min less than last week`;

  // ================= 3️⃣ BEST FOCUS HOUR =================
  const hourFocus = {};

  sessions.forEach(s => {
    if (!s.timestamp) return;
    const hour = new Date(s.timestamp).getHours();
    hourFocus[hour] = (hourFocus[hour] || 0) + (s.focusScore || 0);
  });

  const bestHourEntry = Object.entries(hourFocus).sort((a, b) => b[1] - a[1])[0];
  const bestHourText = bestHourEntry
    ? `🧠 Best focus time: ${bestHourEntry[0]}:00`
    : "";

  // ================= 4️⃣ BADGE HINTS =================
  let badgeHint = "";
  if (streak < 3) badgeHint = `🔥 ${3 - streak} more days to unlock Streak Starter`;
  else if (streak < 7) badgeHint = `🔥 ${7 - streak} more days to unlock Streak Master`;

  // ================= ENHANCED SMART SUGGESTIONS =================
  const container = document.getElementById("suggestionsContainer");
  let suggestions = [];

  // 1. Week Comparison
  suggestions.push({
    icon: thisWeekMin > lastWeekMin ? "📈" : "📉",
    text: thisWeekMin > lastWeekMin
      ? `Great progress! You studied ${Math.round(thisWeekMin - lastWeekMin)} min more than last week`
      : `You studied ${Math.round(lastWeekMin - thisWeekMin)} min less than last week. Let's get back on track!`,
    priority: 1
  });

  // 2. Best Focus Hour
  if (bestHourEntry) {
    const hour = parseInt(bestHourEntry[0]);
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    suggestions.push({
      icon: "🧠",
      text: `Your peak focus time is ${hour}:00 (${timeOfDay}). Schedule important subjects during this window.`,
      priority: 2
    });
  }

  // 3. Badge Progress
  if (badgeHint) {
    suggestions.push({
      icon: "🏆",
      text: badgeHint,
      priority: 3
    });
  }

  // 4. Focus Score Analysis
  if (avgFocus < 50) {
    suggestions.push({
      icon: "⚠️",
      text: "Your average focus is below 50%. Try the Pomodoro technique: 25 min study + 5 min break.",
      priority: 1
    });
  } else if (avgFocus >= 75) {
    suggestions.push({
      icon: "🌟",
      text: `Excellent focus score of ${avgFocus}%! You're in the top tier of productive learners.`,
      priority: 2
    });
  }

  // 5. Subject-Specific Insights
  const subjectStats = {};
  sessions.forEach(s => {
    const subject = s.subject || "Unknown";
    if (!subjectStats[subject]) {
      subjectStats[subject] = { totalMin: 0, avgFocus: 0, count: 0 };
    }
    subjectStats[subject].totalMin += (s.durationSeconds || 0) / 60;
    subjectStats[subject].avgFocus += s.focusScore || 0;
    subjectStats[subject].count += 1;
  });

  // Find weakest subject (lowest focus)
  let weakestSubject = null;
  let lowestFocus = 100;
  Object.keys(subjectStats).forEach(subject => {
    const avgFocus = subjectStats[subject].avgFocus / subjectStats[subject].count;
    if (avgFocus < lowestFocus && subjectStats[subject].count >= 2) {
      lowestFocus = avgFocus;
      weakestSubject = subject;
    }
  });

  if (weakestSubject && lowestFocus < 60) {
    suggestions.push({
      icon: "📚",
      text: `${weakestSubject} has your lowest focus (${Math.round(lowestFocus)}%). Try studying it during your peak hours.`,
      priority: 2
    });
  }

  // Find most studied subject
  let mostStudiedSubject = null;
  let maxMinutes = 0;
  Object.keys(subjectStats).forEach(subject => {
    if (subjectStats[subject].totalMin > maxMinutes) {
      maxMinutes = subjectStats[subject].totalMin;
      mostStudiedSubject = subject;
    }
  });

  if (mostStudiedSubject && Object.keys(subjectStats).length > 1) {
    const otherSubjects = Object.keys(subjectStats).filter(s => s !== mostStudiedSubject);
    suggestions.push({
      icon: "⚖️",
      text: `You're focusing heavily on ${mostStudiedSubject}. Don't forget to balance with ${otherSubjects[0] || 'other subjects'}.`,
      priority: 3
    });
  }

  // 6. Session Length Analysis
  const avgSessionLength = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / sessions.length / 60;
  if (avgSessionLength < 20) {
    suggestions.push({
      icon: "⏱️",
      text: `Your average session is ${Math.round(avgSessionLength)} min. Try extending to 25-30 min for deeper focus.`,
      priority: 2
    });
  } else if (avgSessionLength > 60) {
    suggestions.push({
      icon: "🛑",
      text: `Sessions averaging ${Math.round(avgSessionLength)} min might cause burnout. Consider 50 min + 10 min breaks.`,
      priority: 2
    });
  }

  // 7. Consistency Check (study frequency)
  const uniqueDates = new Set(sessions.map(s => s.date));
  const daysStudied = uniqueDates.size;

  // Get the earliest and latest session dates
  const allDates = sessions.map(s => new Date(s.date).getTime()).filter(d => !isNaN(d));
  if (allDates.length > 0) {
    const earliestDate = Math.min(...allDates);
    const latestDate = Math.max(...allDates);
    const daysSinceFirstSession = Math.max(1, Math.ceil((latestDate - earliestDate) / 86400000) + 1);
    const consistency = Math.min(100, (daysStudied / daysSinceFirstSession) * 100);

    if (consistency < 50 && daysStudied > 3) {
      suggestions.push({
        icon: "📅",
        text: `You're studying ${daysStudied} out of ${daysSinceFirstSession} days (${Math.round(consistency)}%). Daily practice builds momentum!`,
        priority: 1
      });
    } else if (consistency >= 80) {
      suggestions.push({
        icon: "💪",
        text: `Amazing consistency! You're studying ${Math.round(consistency)}% of days. Keep this rhythm going!`,
        priority: 2
      });
    }
  }

  // 8. Pause Pattern Analysis
  const avgPauses = sessions.reduce((a, s) => a + (s.pauseCount || 0), 0) / sessions.length;
  if (avgPauses > 5) {
    suggestions.push({
      icon: "🔕",
      text: `You average ${Math.round(avgPauses)} pauses per session. Try airplane mode or website blockers.`,
      priority: 2
    });
  }

  // 9. Weekend vs Weekday Pattern
  const weekendSessions = sessions.filter(s => {
    const day = new Date(s.date).getDay();
    return day === 0 || day === 6;
  });
  const weekdaySessions = sessions.filter(s => {
    const day = new Date(s.date).getDay();
    return day > 0 && day < 6;
  });

  if (weekendSessions.length > 0 && weekdaySessions.length > 0) {
    const weekendAvgFocus = weekendSessions.reduce((a, s) => a + (s.focusScore || 0), 0) / weekendSessions.length;
    const weekdayAvgFocus = weekdaySessions.reduce((a, s) => a + (s.focusScore || 0), 0) / weekdaySessions.length;

    if (weekendAvgFocus > weekdayAvgFocus + 10) {
      suggestions.push({
        icon: "🌅",
        text: `Your weekend focus (${Math.round(weekendAvgFocus)}%) is higher than weekdays (${Math.round(weekdayAvgFocus)}%). Replicate weekend conditions!`,
        priority: 3
      });
    }
  }

  // 10. Recent Trend (last 3 sessions vs previous 3)
  if (sessions.length >= 6) {
    const recent3 = sessions.slice(0, 3);
    const previous3 = sessions.slice(3, 6);
    const recentAvg = recent3.reduce((a, s) => a + (s.focusScore || 0), 0) / 3;
    const previousAvg = previous3.reduce((a, s) => a + (s.focusScore || 0), 0) / 3;

    if (recentAvg > previousAvg + 15) {
      suggestions.push({
        icon: "🚀",
        text: `Your focus is trending up! Recent sessions: ${Math.round(recentAvg)}% vs ${Math.round(previousAvg)}% before.`,
        priority: 2
      });
    } else if (recentAvg < previousAvg - 15) {
      suggestions.push({
        icon: "📉",
        text: `Focus dipping recently (${Math.round(recentAvg)}% vs ${Math.round(previousAvg)}%). Time for a reset day?`,
        priority: 1
      });
    }
  }

  // Sort by priority and render
  suggestions.sort((a, b) => a.priority - b.priority);

  container.innerHTML = suggestions
    .map(s => `<div class="suggestion-box">${s.icon} ${s.text}</div>`)
    .join("");
});
