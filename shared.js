document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem("memoir_theme");
  const accent = localStorage.getItem("memoir_accent");
  const compact = localStorage.getItem("memoir_compact") === "true";

  if (theme) applyTheme(theme);
  if (accent) applyAccent(accent);
  document.body.classList.toggle("compact-mode", compact);
});
