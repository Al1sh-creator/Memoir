/* ===============================
   Memoir – Smart Focus Timer
   Change 1 + Change 2 (FINAL)
================================ */

let totalTime = (parseInt(localStorage.getItem("memoir_focus_duration")) || 25) * 60;
let remaining = totalTime;
let timerInterval = null;
let isRunning = false;
let lastCompletedSession = null;

// Session mode (count-up)
let elapsedSeconds = 0;
let sessionMode = false;

// Smart tracking
let pauseCount = 0;
let inactiveCount = 0;
let sessionStartTime = null;

// Elements
const timeEl = document.getElementById("time");
const ring = document.querySelector(".progress-ring-fill");
const timerCircle = document.querySelector(".timer-circle");
const percentEl = document.getElementById("percent");

const radius = 100;
const circumference = 2 * Math.PI * radius;

// ================= INIT =================
if (ring) {
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference;
}

// Auto-start session if coming from dashboard (+ Session)
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("session") === "1") {
    sessionMode = true;
    elapsedSeconds = 0;
    updateDisplay();

    // Auto start after DOM settles
    setTimeout(() => {
      document.getElementById("startBtn")?.click();
    }, 300);
  }
});

// ================= UI HELPERS =================
function setRingOffset(remainingSec, totalSec) {
  if (!ring) return;
  const safeTotal = totalSec > 0 ? totalSec : 1;
  const offset = circumference * (remainingSec / safeTotal);
  ring.style.strokeDashoffset = offset;

  if (percentEl) {
    const pct = Math.round((1 - remainingSec / safeTotal) * 100);
    percentEl.textContent = `${Math.max(0, Math.min(100, pct))}%`;
  }
}

function updateDisplay() {
  if (sessionMode) {
    const min = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const sec = String(elapsedSeconds % 60).padStart(2, "0");
    timeEl.textContent = `${min}:${sec}`;
    if (ring) ring.style.strokeDashoffset = circumference;
    if (percentEl) percentEl.textContent = `${Math.floor(elapsedSeconds / 60)}m`;
  } else {
    const min = String(Math.floor(remaining / 60)).padStart(2, "0");
    const sec = String(remaining % 60).padStart(2, "0");
    timeEl.textContent = `${min}:${sec}`;
    setRingOffset(remaining, totalTime);
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isRunning = false;
}

// ================= SMART LOGIC =================
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isRunning) {
    inactiveCount++;
  }
});

function calculateFocusScore() {
  let score = 100;
  score -= pauseCount * 10;
  score -= inactiveCount * 15;
  return Math.max(0, score);
}

function getProductivityLabel(score) {
  if (score >= 75) return "Focused";
  if (score >= 40) return "Average";
  return "Distracted";
}

// ================= BUTTON HANDLERS =================
document.getElementById("startBtn").onclick = () => {
  if (isRunning) return;
  isRunning = true;

  if (!sessionStartTime) sessionStartTime = Date.now();
  timerCircle.classList.remove("timer-done");

  // Session mode (count-up)
  if (sessionMode) {
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateDisplay();
    }, 1000);
    return;
  }

  // Countdown mode
  if (remaining <= 0) remaining = totalTime;

  timerInterval = setInterval(() => {
    if (remaining > 0) {
      remaining--;
      updateDisplay();
    } else {
      stopTimer();
      setRingOffset(0, totalTime);
      timerCircle.classList.add("timer-done");

      const now = new Date();
      const focusScore = calculateFocusScore();

      lastCompletedSession = {
        id: "s_" + now.getTime(),
        date: new Date().toISOString().split("T")[0],
        durationSeconds: totalTime,
        pauseCount,
        inactiveCount,
        focusScore,
        productivity: getProductivityLabel(focusScore),
        subject: document.getElementById("subjectBox")?.innerText || "",
        goal: document.getElementById("goalBox")?.innerText || "",
        createdAt: now.getTime()
      };

      new bootstrap.Modal(
        document.getElementById("sessionDone")
      ).show();
    }
  }, 1000);
};

document.getElementById("pauseBtn").onclick = () => {
  pauseCount++;
  stopTimer();
};

document.getElementById("resetBtn").onclick = () => {
  stopTimer();
  elapsedSeconds = 0;
  remaining = totalTime;
  setRingOffset(remaining, totalTime);
  timerCircle.classList.remove("timer-done");
  updateDisplay();
};

// ================= MODE SELECTOR =================
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    stopTimer();

    if (btn.dataset.time === "custom") {
      new bootstrap.Modal(document.getElementById("customTimeModal")).show();
      return;
    }

    if (btn.dataset.time === "session") {
      sessionMode = true;
      elapsedSeconds = 0;
      document.getElementById("finishBtn")?.classList.remove("d-none");
      updateDisplay();
      return;
    }

    sessionMode = false;
    document.getElementById("finishBtn")?.classList.add("d-none");
    totalTime = Number(btn.dataset.time) * 60;
    remaining = totalTime;
    updateDisplay();
  };
});

document.getElementById("setCustomTime").onclick = () => {
  const mins = parseInt(document.getElementById("customMinutes").value, 10);
  if (!mins || mins <= 0) return;

  bootstrap.Modal.getInstance(
    document.getElementById("customTimeModal")
  ).hide();

  stopTimer();
  totalTime = mins * 60;
  remaining = totalTime;
  updateDisplay();
};

// ================= SESSION MODE FINISH =================
const finishBtn = document.getElementById("finishBtn");
if (finishBtn) {
  finishBtn.onclick = () => {
    stopTimer();

    const now = new Date();
    const focusScore = calculateFocusScore();

    lastCompletedSession = {
      id: "s_" + now.getTime(),
      date: new Date().toISOString().split("T")[0],
      durationSeconds: elapsedSeconds,
      pauseCount,
      inactiveCount,
      focusScore,
      productivity: getProductivityLabel(focusScore),
      subject: document.getElementById("subjectBox")?.innerText || "",
      goal: document.getElementById("goalBox")?.innerText || "",
      createdAt: now.getTime()
    };

    new bootstrap.Modal(
      document.getElementById("sessionDone")
    ).show();
  };
}

// ================= SAVE SESSION =================
const saveBtn = document.getElementById("saveSessionBtn");
if (saveBtn) {
  saveBtn.onclick = () => {
    if (!lastCompletedSession) return;

    const subjectInput = document.getElementById("sessionSubject");
    const noteInput = document.getElementById("sessionNote");

    const sessionData = {
      ...lastCompletedSession,
      subject: subjectInput?.value || lastCompletedSession.subject,
      note: noteInput?.value || "",
      timestamp: Date.now()
    };

    const raw = localStorage.getItem("sessions");
    const sessions = raw ? JSON.parse(raw) : [];
    sessions.push(sessionData);
    localStorage.setItem("sessions", JSON.stringify(sessions));

    // Reset smart counters
    pauseCount = 0;
    inactiveCount = 0;
    sessionStartTime = null;
    elapsedSeconds = 0;

    bootstrap.Modal.getInstance(
      document.getElementById("sessionDone")
    ).hide();

    window.location.href = "Sessions.html";
  };
}

// Initial render
updateDisplay();
