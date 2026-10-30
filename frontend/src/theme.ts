export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "sababuka-theme";

export function readTheme(): ThemeMode {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeTheme(): ThemeMode {
  const theme = readTheme();
  applyTheme(theme);
  return theme;
}
