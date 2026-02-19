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
  const focusDuration = localStorage.getItem(`memoir_focus_duration_${userId}`) || "25";
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

  const accentEl = document.querySelector("#accentColor");
  if (accentEl) accentEl.value = savedAccent;

  const compactEl = document.querySelector("#compactToggle");
  if (compactEl) compactEl.checked = compactMode;

  const focusEl = document.querySelector("#focusDuration");
  if (focusEl) focusEl.value = focusDuration + " min";

  const autoLogEl = document.querySelector("#autoLogSessions");
  if (autoLogEl) autoLogEl.checked = autoLogSessions;

  const pauseEl = document.querySelector("#pauseOnInactivity");
  if (pauseEl) pauseEl.checked = pauseOnInactivity;

  const reminderEl = document.querySelector("#dailyReminder");
  if (reminderEl) reminderEl.checked = dailyReminder;

  const reminderTimeEl = document.querySelector("#reminderTime");
  if (reminderTimeEl) reminderTimeEl.value = reminderTime;

  const displayNameEl = document.querySelector("#displayName");
  if (displayNameEl) displayNameEl.value = displayName;


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
  if (accentEl) {
    accentEl.addEventListener("input", e => {
      applyAccent(e.target.value);
      localStorage.setItem("memoir_accent", e.target.value);
    });
  }

  // Compact Mode
  if (compactEl) {
    compactEl.addEventListener("change", e => {
      document.body.classList.toggle("compact-mode", e.target.checked);
      localStorage.setItem("memoir_compact", e.target.checked);
    });
  }

  // Focus Duration
  if (focusEl) {
    focusEl.addEventListener("change", e => {
      localStorage.setItem(
        `memoir_focus_duration_${userId}`,
        e.target.value.replace(" min", "")
      );
    });
  }

  // Automation toggles
  if (autoLogEl) {
    autoLogEl.addEventListener("change", e => {
      localStorage.setItem("memoir_auto_log_sessions", e.target.checked);
    });
  }

  if (pauseEl) {
    pauseEl.addEventListener("change", e => {
      localStorage.setItem("memoir_pause_inactivity", e.target.checked);
    });
  }


  // Notifications
  if (reminderEl) {
    reminderEl.addEventListener("change", e => {
      localStorage.setItem("memoir_daily_reminder", e.target.checked);
      e.target.checked ? scheduleDailyReminder() : clearDailyReminder();
    });
  }

  if (reminderTimeEl) {
    reminderTimeEl.addEventListener("change", e => {
      localStorage.setItem("memoir_reminder_time", e.target.value);
      if (reminderEl && reminderEl.checked) {
        scheduleDailyReminder();
      }
    });
  }

  if (dailyReminder) scheduleDailyReminder();

  // Email (read-only)
  const emailEl = document.querySelector("#email");
  if (emailEl) emailEl.value = currentUser.email || "";


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
      const dailyVal = parseFloat(document.querySelector("#dailyGoal").value) || 0;
      const weeklyVal = parseFloat(document.querySelector("#weeklyGoal").value) || 0;
      const monthlyVal = parseFloat(document.querySelector("#monthlyGoal").value) || 0;
      const totalVal = parseFloat(document.querySelector("#totalGoal").value) || 0;

      // VALIDATION
      if (dailyVal > weeklyVal) {
        alert("⚠️ Daily goal cannot be greater than Weekly goal.");
        return;
      }
      if (weeklyVal > monthlyVal) {
        alert("⚠️ Weekly goal cannot be greater than Monthly goal.");
        return;
      }

      localStorage.setItem(`memoir_goal_daily_${userId}`, dailyVal);
      localStorage.setItem(`memoir_goal_weekly_${userId}`, weeklyVal);
      localStorage.setItem(`memoir_goal_monthly_${userId}`, monthlyVal);
      localStorage.setItem(`memoir_goal_total_${userId}`, totalVal);

      alert("Goals updated successfully! 🎯");

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
  if (!("Notification" in window)) {
    alert("Your browser does not support notifications. Please use a modern browser.");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        setDailyReminder();
        alert("✅ Notification permission granted! Daily reminder has been set.");
      } else {
        alert("❌ Notification permission was denied. Please allow notifications in your browser settings.");
        // Uncheck the toggle since permission was denied
        const toggle = document.querySelector("#dailyReminder");
        if (toggle) toggle.checked = false;
        localStorage.setItem("memoir_daily_reminder", "false");
      }
    });
  } else if (Notification.permission === "granted") {
    setDailyReminder();
  } else {
    alert("❌ Notifications are blocked. Please allow notifications in your browser settings for this site.");
    const toggle = document.querySelector("#dailyReminder");
    if (toggle) toggle.checked = false;
    localStorage.setItem("memoir_daily_reminder", "false");
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

  const msUntilReminder = next - now;
  console.log(`⏰ Daily reminder scheduled for ${next.toLocaleString()} (in ${Math.round(msUntilReminder / 60000)} minutes)`);

  window.dailyReminderTimeout = setTimeout(() => {
    new Notification("Memoir Study Reminder", {
      body: "Time to study! Stay consistent 💪",
      icon: "/favicon.ico"
    });
    setDailyReminder(); // Reschedule for next day
  }, msUntilReminder);
}

function clearDailyReminder() {
  if (window.dailyReminderTimeout) {
    clearTimeout(window.dailyReminderTimeout);
    console.log("⏰ Daily reminder cleared");
  }
}
