document.addEventListener("DOMContentLoaded", () => {

  /* ========== LOAD SAVED SETTINGS ========== */
  const savedTheme = localStorage.getItem("memoir_theme") || "light";
  const savedAccent = localStorage.getItem("memoir_accent") || "#0d6efd";
  const compactMode = localStorage.getItem("memoir_compact") === "true";

  applyTheme(savedTheme);
  applyAccent(savedAccent);
  document.body.classList.toggle("compact-mode", compactMode);

  /* ========== THEME ========== */
  const themeSelect = document.querySelector("#themeSelect");
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", e => {
      applyTheme(e.target.value);
      localStorage.setItem("memoir_theme", e.target.value);
    });
  }

  /* ========== ACCENT COLOR ========== */
  const accentPicker = document.querySelector("#accentColor");
  if (accentPicker) {
    accentPicker.value = savedAccent;
    accentPicker.addEventListener("input", e => {
      applyAccent(e.target.value);
      localStorage.setItem("memoir_accent", e.target.value);
    });
  }

  /* ========== COMPACT MODE ========== */
  const compactToggle = document.querySelector("#compactToggle");
  if (compactToggle) {
    compactToggle.checked = compactMode;
    compactToggle.addEventListener("change", e => {
      document.body.classList.toggle("compact-mode", e.target.checked);
      localStorage.setItem("memoir_compact", e.target.checked);
    });
  }
});

/* ===== HELPERS ===== */
function applyTheme(mode) {
  document.body.classList.remove("dark-mode");

  if (mode === "dark") {
    document.body.classList.add("dark-mode");
  }

  if (mode === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
    }
  }
}

function applyAccent(color) {
  document.documentElement.style.setProperty("--accent-color", color);
}
