  document.addEventListener("DOMContentLoaded", () => {

  /* ========== LOAD SAVED SETTINGS ========== */
  const savedTheme = localStorage.getItem("memoir_theme") || "light";
  const savedAccent = localStorage.getItem("memoir_accent") || "#0d6efd";
  const compactMode = localStorage.getItem("memoir_compact") === "true";
  const focusDuration = localStorage.getItem("memoir_focus_duration") || "25";
  const autoLogSessions = localStorage.getItem("memoir_auto_log_sessions") === "true";
  const pauseOnInactivity = localStorage.getItem("memoir_pause_inactivity") === "true";
  const dailyReminder = localStorage.getItem("memoir_daily_reminder") === "true";
  const reminderTime = localStorage.getItem("memoir_reminder_time") || "09:00";
  const displayName = localStorage.getItem("memoir_display_name") || "";

  // Load Study Goals from localStorage
  const dailyGoal = localStorage.getItem("memoir_goal_daily") || "4";
  const weeklyGoal = localStorage.getItem("memoir_goal_weekly") || "20";
  const monthlyGoal = localStorage.getItem("memoir_goal_monthly") || "80";
  const totalGoal = localStorage.getItem("memoir_goal_total") || "200";

  // Apply loaded settings to form
  document.querySelector("#themeSelect").value = savedTheme;
  document.querySelector("#accentColor").value = savedAccent;
  document.querySelector("#compactToggle").checked = compactMode;
  document.querySelector("#focusDuration").value = focusDuration + " min";
  document.querySelector("#autoLogSessions").checked = autoLogSessions;
  document.querySelector("#pauseOnInactivity").checked = pauseOnInactivity;
  document.querySelector("#dailyReminder").checked = dailyReminder;
  document.querySelector("#reminderTime").value = reminderTime;
  document.querySelector("#displayName").value = displayName;

  // Load goals if elements exist
  if (document.getElementById("dailyGoal")) {
    document.querySelector("#dailyGoal").value = dailyGoal;
    document.querySelector("#weeklyGoal").value = weeklyGoal;
    document.querySelector("#monthlyGoal").value = monthlyGoal;
    document.querySelector("#totalGoal").value = totalGoal;
  }

  /* ========== EVENT LISTENERS ========== */

  // Theme
  document.querySelector("#themeSelect").addEventListener("change", e => {
    applyTheme(e.target.value);
    localStorage.setItem("memoir_theme", e.target.value);

    // Set up system theme listener if system theme is selected
    if (e.target.value === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (event) => {
        if (localStorage.getItem("memoir_theme") === "system") {
          applyTheme("system");
        }
      });
    }
  });

  // Accent Color
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
    const value = e.target.value.replace(" min", "");
    localStorage.setItem("memoir_focus_duration", value);
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
    if (e.target.checked) {
      scheduleDailyReminder();
    } else {
      clearDailyReminder();
    }
  });

  document.querySelector("#reminderTime").addEventListener("change", e => {
    localStorage.setItem("memoir_reminder_time", e.target.value);
    if (document.querySelector("#dailyReminder").checked) {
      scheduleDailyReminder();
    }
  });

  // Initialize notifications if enabled
  if (dailyReminder) {
    scheduleDailyReminder();
  }

  // Account Save
  const saveButtons = document.querySelectorAll("button.btn-primary");
  let accountSaveBtn = null;
  saveButtons.forEach(btn => {
    if (btn.id !== "saveGoalsBtn") {
      accountSaveBtn = btn;
    }
  });

  if (accountSaveBtn) {
    accountSaveBtn.addEventListener("click", () => {
      const name = document.querySelector("#displayName").value;
      localStorage.setItem("memoir_display_name", name);
      alert("Settings saved!");
    });
  }

  // Save Goals
  const saveGoalsBtn = document.getElementById("saveGoalsBtn");
  if (saveGoalsBtn) {
    saveGoalsBtn.addEventListener("click", () => {
      const daily = document.querySelector("#dailyGoal").value;
      const weekly = document.querySelector("#weeklyGoal").value;
      const monthly = document.querySelector("#monthlyGoal").value;
      const total = document.querySelector("#totalGoal").value;

      localStorage.setItem("memoir_goal_daily", daily);
      localStorage.setItem("memoir_goal_weekly", weekly);
      localStorage.setItem("memoir_goal_monthly", monthly);
      localStorage.setItem("memoir_goal_total", total);

      alert("Goals updated successfully!");
      
      // Reload dashboard if it exists
      if (window.dashboardManager) {
        window.dashboardManager.loadGoals();
        window.dashboardManager.initializeDashboard();
      }
    });
  }

  // Export Data
  document.querySelector("#exportData").addEventListener("click", () => {
    const data = {
      sessions: JSON.parse(localStorage.getItem("studySessions") || "[]"),
      badges: JSON.parse(localStorage.getItem("earnedBadges") || "[]"),
      settings: {
        theme: localStorage.getItem("memoir_theme"),
        accent: localStorage.getItem("memoir_accent"),
        compact: localStorage.getItem("memoir_compact"),
        focusDuration: localStorage.getItem("memoir_focus_duration"),
        displayName: localStorage.getItem("memoir_display_name")
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memoir-study-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Delete Account
  document.querySelector("#deleteAccount").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete your account? This will remove all your data.")) {
      localStorage.clear();
      window.location.href = "landing.html";
    }
  });

});

// ===== NOTIFICATION FUNCTIONS =====
function scheduleDailyReminder() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        setDailyReminder();
      }
    });
  } else if (Notification.permission === "granted") {
    setDailyReminder();
  }
}

function setDailyReminder() {
  const time = localStorage.getItem("memoir_reminder_time") || "09:00";
  const [hours, minutes] = time.split(":").map(Number);

  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const delay = reminderTime - now;

  // Clear existing timeout
  if (window.dailyReminderTimeout) {
    clearTimeout(window.dailyReminderTimeout);
  }

  window.dailyReminderTimeout = setTimeout(() => {
    new Notification("Memoir Study Reminder", {
      body: "Time to study! Keep up the good work.",
      icon: "/favicon.ico" // Add an icon if available
    });

    // Schedule next day's reminder
    setDailyReminder();
  }, delay);
}

function clearDailyReminder() {
  if (window.dailyReminderTimeout) {
    clearTimeout(window.dailyReminderTimeout);
  }
}
