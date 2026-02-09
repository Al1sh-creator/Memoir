document.addEventListener("DOMContentLoaded", () => {

  /* ================= AUTH CONTEXT ================= */
  let currentUser = null;
  try {
    currentUser =
      (window.auth && typeof window.auth.getCurrentUser === "function")
        ? auth.getCurrentUser()
        : (localStorage.getItem("memoir_current_user")
            ? JSON.parse(localStorage.getItem("memoir_current_user"))
            : null);
  } catch (e) {
    currentUser = null;
  }

  if (!currentUser) {
    window.location.href = "landing.html";
    return;
  }

  const userId = currentUser.id;

  /* ================= LOAD SAVED SETTINGS ================= */
  const savedTheme = localStorage.getItem("memoir_theme") || "light";
  const savedAccent = localStorage.getItem("memoir_accent") || "#0d6efd";
  const compactMode = localStorage.getItem("memoir_compact") === "true";
  const focusDuration = localStorage.getItem("memoir_focus_duration") || "25";
  const autoLogSessions = localStorage.getItem("memoir_auto_log_sessions") === "true";
  const pauseOnInactivity = localStorage.getItem("memoir_pause_inactivity") === "true";
  const dailyReminder = localStorage.getItem("memoir_daily_reminder") === "true";
  const reminderTime = localStorage.getItem("memoir_reminder_time") || "09:00";
  const displayName = localStorage.getItem("memoir_display_name") || "";

  // Goals (USER-SPECIFIC)
  const dailyGoal = localStorage.getItem(`memoir_goal_daily_${userId}`) || "4";
  const weeklyGoal = localStorage.getItem(`memoir_goal_weekly_${userId}`) || "20";
  const monthlyGoal = localStorage.getItem(`memoir_goal_monthly_${userId}`) || "80";
  const totalGoal = localStorage.getItem(`memoir_goal_total_${userId}`) || "200";

  /* ================= APPLY SETTINGS ================= */
  document.querySelector("#themeSelect").value = savedTheme;
  document.querySelector("#accentColor").value = savedAccent;
  document.querySelector("#compactToggle").checked = compactMode;
  document.querySelector("#focusDuration").value = focusDuration + " min";
  document.querySelector("#autoLogSessions").checked = autoLogSessions;
  document.querySelector("#pauseOnInactivity").checked = pauseOnInactivity;
  document.querySelector("#dailyReminder").checked = dailyReminder;
  document.querySelector("#reminderTime").value = reminderTime;
  document.querySelector("#displayName").value = displayName;

  if (document.querySelector("#email")) {
    document.querySelector("#email").value = currentUser.email || "";
  }

  if (document.getElementById("dailyGoal")) {
    document.querySelector("#dailyGoal").value = dailyGoal;
    document.querySelector("#weeklyGoal").value = weeklyGoal;
    document.querySelector("#monthlyGoal").value = monthlyGoal;
    document.querySelector("#totalGoal").value = totalGoal;
  }

  /* ================= EVENT LISTENERS ================= */

  // Theme
  document.querySelector("#themeSelect").addEventListener("change", e => {
    applyTheme(e.target.value);
    localStorage.setItem("memoir_theme", e.target.value);

    if (e.target.value === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", () => {
        if (localStorage.getItem("memoir_theme") === "system") {
          applyTheme("system");
        }
      });
    }
  });

  // Accent
  document.querySelector("#accentColor").addEventListener("input", e => {
    applyAccent(e.target.value);
    localStorage.setItem("memoir_accent", e.target.value);
  });

  // Compact Mode
  document.querySelector("#compactToggle").addEventListener("change", e => {
    document.body.classList.toggle("compact-mode", e.target.checked);
    localStorage.setItem("memoir_compact", e.target.checked);
  });

  // Focus Duration
  document.querySelector("#focusDuration").addEventListener("change", e => {
    localStorage.setItem(
      "memoir_focus_duration",
      e.target.value.replace(" min", "")
    );
  });

  // Automation toggles
  document.querySelector("#autoLogSessions").addEventListener("change", e => {
    localStorage.setItem("memoir_auto_log_sessions", e.target.checked);
  });

  document.querySelector("#pauseOnInactivity").addEventListener("change", e => {
    localStorage.setItem("memoir_pause_inactivity", e.target.checked);
  });

  // Notifications
  document.querySelector("#dailyReminder").addEventListener("change", e => {
    localStorage.setItem("memoir_daily_reminder", e.target.checked);
    e.target.checked ? scheduleDailyReminder() : clearDailyReminder();
  });

  document.querySelector("#reminderTime").addEventListener("change", e => {
    localStorage.setItem("memoir_reminder_time", e.target.value);
    if (document.querySelector("#dailyReminder").checked) {
      scheduleDailyReminder();
    }
  });

  if (dailyReminder) scheduleDailyReminder();

  // Save account settings
  document.querySelectorAll("button.btn-primary").forEach(btn => {
    if (btn.id !== "saveGoalsBtn") {
      btn.addEventListener("click", () => {
        localStorage.setItem(
          "memoir_display_name",
          document.querySelector("#displayName").value
        );
        alert("Settings saved!");
      });
    }
  });

  // Save goals (USER-SPECIFIC)
  const saveGoalsBtn = document.getElementById("saveGoalsBtn");
  if (saveGoalsBtn) {
    saveGoalsBtn.addEventListener("click", () => {
      localStorage.setItem(`memoir_goal_daily_${userId}`, document.querySelector("#dailyGoal").value);
      localStorage.setItem(`memoir_goal_weekly_${userId}`, document.querySelector("#weeklyGoal").value);
      localStorage.setItem(`memoir_goal_monthly_${userId}`, document.querySelector("#monthlyGoal").value);
      localStorage.setItem(`memoir_goal_total_${userId}`, document.querySelector("#totalGoal").value);

      alert("Goals updated successfully!");

      if (window.dashboardManager) {
        window.dashboardManager.loadGoals();
        window.dashboardManager.initializeDashboard();
      }
    });
  }

  // Export Data (USER-SAFE)
  document.querySelector("#exportData").addEventListener("click", () => {
    const data = {
      sessions: JSON.parse(localStorage.getItem(`memoir_sessions_${userId}`) || "[]"),
      settings: {
        theme: savedTheme,
        accent: savedAccent,
        compact: compactMode,
        focusDuration,
        displayName
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "memoir-study-data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ================= DELETE ACCOUNT (FIXED) ================= */
  document.querySelector("#deleteAccount").addEventListener("click", () => {
    if (!confirm("This will permanently delete ONLY your account data. Continue?")) return;

    localStorage.removeItem(`memoir_sessions_${userId}`);
    localStorage.removeItem(`memoir_subjects_${userId}`);
    localStorage.removeItem(`memoir_goal_daily_${userId}`);
    localStorage.removeItem(`memoir_goal_weekly_${userId}`);
    localStorage.removeItem(`memoir_goal_monthly_${userId}`);
    localStorage.removeItem(`memoir_goal_total_${userId}`);
    localStorage.removeItem("memoir_current_user");

    window.location.href = "landing.html";
  });

});

/* ================= NOTIFICATION FUNCTIONS ================= */
function scheduleDailyReminder() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    Notification.requestPermission().then(p => p === "granted" && setDailyReminder());
  } else if (Notification.permission === "granted") {
    setDailyReminder();
  }
}

function setDailyReminder() {
  const time = localStorage.getItem("memoir_reminder_time") || "09:00";
  const [h, m] = time.split(":").map(Number);

  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  if (window.dailyReminderTimeout) clearTimeout(window.dailyReminderTimeout);

  window.dailyReminderTimeout = setTimeout(() => {
    new Notification("Memoir Study Reminder", {
      body: "Time to study! Stay consistent 💪",
      icon: "/favicon.ico"
    });
    setDailyReminder();
  }, next - now);
}

function clearDailyReminder() {
  if (window.dailyReminderTimeout) {
    clearTimeout(window.dailyReminderTimeout);
  }
}
