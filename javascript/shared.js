document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem("memoir_theme") || "light";
  const accent = localStorage.getItem("memoir_accent") || "#0d6efd";
  const compact = localStorage.getItem("memoir_compact") === "true";

  applyTheme(theme);
  applyAccent(accent);
  document.body.classList.toggle("compact-mode", compact);

  // Listen for system theme changes when theme is set to "system"
  if (theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      if (localStorage.getItem("memoir_theme") === "system") {
        applyTheme("system");
      }
    });
  }
});

/* ===== HELPERS ===== */
function applyTheme(mode) {
  document.body.classList.remove("dark-mode");

  if (mode === "dark") {
    document.body.classList.add("dark-mode");
  } else if (mode === "system") {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
    }
  }
}

function applyAccent(color) {
  document.documentElement.style.setProperty("--accent-color", color);
}
