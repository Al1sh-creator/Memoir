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

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  const dailyMinutes = last7Days.map(date =>
    Math.round(
      sessions
        .filter(s => s.date === date)
        .reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60
    )
  );

  const labels = last7Days.map(d =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short" })
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

  // ================= SMART SUGGESTIONS =================
  const container = document.getElementById("suggestionsContainer");
  let suggestions = "";

  suggestions += `<div class="suggestion-box">${weekComparison}</div>`;

  if (bestHourText) {
    suggestions += `<div class="suggestion-box">${bestHourText}</div>`;
  }

  if (badgeHint) {
    suggestions += `<div class="suggestion-box">${badgeHint}</div>`;
  }

  if (avgFocus < 50) {
    suggestions += `
      <div class="suggestion-box">
        ⚠️ Try shorter sessions (25–30 min) to improve focus
      </div>`;
  }

  container.innerHTML = suggestions;
});
