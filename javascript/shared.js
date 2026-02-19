document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem("memoir_theme") || "light";
  const compact = localStorage.getItem("memoir_compact") === "true";

  applyTheme(theme);
  document.body.classList.toggle("compact-mode", compact);

  /* ===== ACCENT COLOR ===== */
  const savedAccent = localStorage.getItem("memoir_accent") || "#6366f1";
  applyAccent(savedAccent);

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
function applyAccent(color) {
  document.documentElement.style.setProperty("--primary-color", color);
  document.documentElement.style.setProperty("--accent-color", color);
  document.documentElement.style.setProperty("--primary-hover", color);

  // Convert hex to RGB for rgba() usage in box-shadows
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
}


function applyTheme(mode) {
  console.log("Applying theme:", mode);
  document.body.classList.remove("dark-mode");

  if (mode === "dark") {
    document.body.classList.add("dark-mode");
    document.body.classList.remove("bg-light");
  } else if (mode === "system") {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
    }
  } else {
    // Light mode
    document.body.classList.add("bg-light");
  }
}


