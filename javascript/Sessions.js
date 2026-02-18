// ================== LOAD DATA ==================
(function () {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) {
    window.location.href = "landing.html";
    return;
  }
  const userId = currentUser.id;

  const rawSessions = JSON.parse(localStorage.getItem(`memoir_sessions_${userId}`)) || [];
  const container = document.getElementById("sessionsContainer");
  const summaryBox = document.getElementById("overallSummary");
  const filters = document.querySelectorAll(".filter-pill");

  if (!container) {
    console.error("sessionsContainer not found");
    return;
  }
  const RARE_BADGES = [
    "streak_7",
    "marathon_day",
    "consistency_5"
  ];

  // ================== BADGE HELPER ==================
  function unlockBadge(badge) {
    const earned =
      JSON.parse(localStorage.getItem(`memoir_badges_${userId}`)) || [];

    if (earned.some(b => b.id === badge.id)) return;

    earned.push({
      ...badge,
      earnedAt: Date.now()
    });

    localStorage.setItem(`memoir_badges_${userId}`, JSON.stringify(earned));
    showBadgeToast(badge);
    if (RARE_BADGES.includes(badge.id)) {
      launchConfetti();
    }
  }
  window.unlockBadge = unlockBadge;
  //================= BADGE TOAST ==================
  function showBadgeToast(badge) {
    const toast = document.getElementById("badgeToast");
    if (!toast) return;

    document.getElementById("badgeToastIcon").innerText = badge.icon;
    document.getElementById("badgeToastText").innerText =
      `Unlocked: ${badge.name}`;

    toast.classList.remove("hidden");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
  // ================== CONFETTI LAUNCHER ==================
  function launchConfetti() {
    if (typeof confetti !== "function") return;

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  // ================== NORMALIZE SESSIONS ==================
  const sessions = rawSessions.map(s => {
    let prod = s.productivity;
    if (!prod || !["Focused", "Average", "Distracted"].includes(prod)) {
      prod = "Unrated";
    }

    return {
      date: s.date || "Unknown",
      durationSeconds: s.durationSeconds || 0,
      subject: s.subject || s.course || "No subject",
      pauseCount: s.pauseCount ?? 0,
      inactiveCount: s.inactiveCount ?? 0,
      focusScore: s.focusScore ?? 0,
      productivity: prod,
      timestamp: s.timestamp || null
    };
  });

  // ================== STREAK LOGIC ==================
  function calculateFocusStreak(sessions) {
    const byDate = {};

    sessions.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    const isStreakDay = (daySessions) => {
      if (!daySessions || daySessions.length === 0) return false;
      const totalMin = daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
      const avgFocus = daySessions.reduce((a, s) => a + (s.focusScore || 0), 0) / daySessions.length;
      const hasFocused = daySessions.some(s => s.productivity === "Focused");
      return totalMin >= 30 && avgFocus >= 60 && hasFocused;
    };

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dKey = `${y}-${m}-${day}`;

      if (byDate[dKey] && isStreakDay(byDate[dKey])) {
        streak++;
      } else {
        if (i === 0) {
          // Today isn't a streak day yet, check yesterday to continue the streak
          continue;
        } else {
          // Streak broken
          break;
        }
      }
    }

    return streak;
  }

  // ================== GLOBAL BADGE CHECKS (RUN ONCE) ==================

  // 🔥 Streak badges
  const streak = calculateFocusStreak(sessions);

  if (streak >= 3) {
    unlockBadge({ id: "streak_3", name: "Streak Starter", icon: "🔥" });
  }
  if (streak >= 7) {
    unlockBadge({ id: "streak_7", name: "Streak Master", icon: "⚡" });
  }
  if (streak >= 30) {
    unlockBadge({ id: "streak_30", name: "Habit Hero", icon: "🏆" });
  }

  // 📅 Consistency badge
  const uniqueDays = [...new Set(sessions.map(s => s.date))];
  if (uniqueDays.length >= 5) {
    unlockBadge({ id: "consistency_5", name: "Consistency Champ", icon: "📅" });
  }
  if (uniqueDays.length >= 14) {
    unlockBadge({ id: "consistency_14", name: "Dedicated Learner", icon: "🛡️" });
  }

  // 🌙 Night Owl badge
  sessions.forEach(s => {
    if (!s.timestamp) return;
    const hour = new Date(s.timestamp).getHours();
    if (hour >= 22 || hour < 4) {
      unlockBadge({ id: "night_owl", name: "Night Owl", icon: "🦉" });
    }
  });

  // ================== RENDER FUNCTION ==================
  function render(filter = "all") {
    container.innerHTML = "";

    const filtered =
      filter === "all"
        ? sessions
        : sessions.filter(s => s.productivity === filter);


    if (!filtered.length) {
      container.innerHTML = `<p class="text-muted">No sessions found.</p>`;
      return;
    }

    // ---------- Summary ----------
    const totalMin = Math.round(
      filtered.reduce((a, b) => a + b.durationSeconds, 0) / 60
    );
    const avgFocus = Math.round(
      filtered.reduce((a, b) => a + b.focusScore, 0) / filtered.length
    );

    if (summaryBox) {
      summaryBox.innerText = `Total ${totalMin} min • Avg Focus ${avgFocus}%`;
    }

    // ---------- Group by date ----------
    const grouped = {};
    filtered.forEach(s => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });

    Object.keys(grouped).sort().reverse().forEach(date => {
      const daySessions = grouped[date];

      const dayTotalMin =
        daySessions.reduce((a, s) => a + s.durationSeconds, 0) / 60;

      const dayMaxFocus = Math.max(...daySessions.map(s => s.focusScore || 0), 0);

      // 🧠 Focus Beast (80%+ focus)
      if (dayMaxFocus >= 80) {
        unlockBadge({ id: "focus_80", name: "Focus Beast", icon: "🧠" });
      }

      // ✨ Perfect Focus (90%+ focus session)
      if (dayMaxFocus >= 90) {
        unlockBadge({ id: "perfect_day", name: "Perfect Focus", icon: "✨" });
      }

      // ⏱️ Deep Worker (2+ hours in one session - simplified to day total for Sessions.js if needed, or check max session)
      const maxSessionDur = Math.max(...daySessions.map(s => s.durationSeconds), 0);
      if (maxSessionDur >= 120 * 60) {
        unlockBadge({ id: "deep_worker", name: "Deep Worker", icon: "⏱️" });
      }

      // 🏃 Marathoner (3+ hours in a day)
      if (dayTotalMin >= 180) {
        unlockBadge({ id: "marathon_day", name: "Marathoner", icon: "🏃" });
      }

      const dayCard = document.createElement("div");
      dayCard.className = "day-card";
      dayCard.innerHTML = `<h6 class="fw-bold mb-2">📅 ${date}</h6>`;

      daySessions.forEach(s => {
        const badgeClass =
          s.productivity === "Focused"
            ? "focused-badge"
            : s.productivity === "Average"
              ? "average-badge"
              : s.productivity === "Distracted"
                ? "distracted-badge"
                : "average-badge";

        const card = document.createElement("div");
        card.className = `session-card ${s.productivity.toLowerCase()}`;

        card.innerHTML = `
        <div class="d-flex justify-content-between">
          <strong>${Math.round(s.durationSeconds / 60)} min</strong>
          <span class="focus-badge ${badgeClass}">
            ${s.productivity === "Unrated" ? "Old Session" : s.productivity}
          </span>
        </div>
        <div class="session-meta">${s.subject}</div>
        <div class="session-meta">
          ${s.productivity === "Unrated"
            ? "No focus data"
            : `Focus ${s.focusScore}% • Pauses ${s.pauseCount} • Distractions ${s.inactiveCount}`
          }
        </div>
      `;

        dayCard.appendChild(card);
      });

      container.appendChild(dayCard);
    });

    // ---------- Streak Display ----------
    const streakBox = document.getElementById("streakDisplay");
    if (streakBox) {
      streakBox.innerHTML =
        streak > 0
          ? `🔥 Focus Streak: <strong>${streak} day${streak > 1 ? "s" : ""}</strong>`
          : "No active focus streak";
    }
  }

  // ================== FILTER EVENTS ==================
  filters.forEach(btn => {
    btn.onclick = () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.filter);
    };
  });

  // ================== INITIAL RENDER ==================
  render("all");
})();
