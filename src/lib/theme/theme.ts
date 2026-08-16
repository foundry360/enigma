export const THEME_STORAGE_KEY = "enigma-theme";
export const THEME_RESOLVED_KEY = "enigma-theme-resolved";

export const themes = ["light", "dark", "system"] as const;

export type Theme = (typeof themes)[number];

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(theme: Theme) {
  if (theme !== "system") {
    return theme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function isDarkFromCookies(
  theme: string | undefined,
  resolved: string | undefined,
) {
  if (theme === "light") {
    return false;
  }

  if (theme === "dark") {
    return true;
  }

  if (resolved === "light") {
    return false;
  }

  if (resolved === "dark") {
    return true;
  }

  return DEFAULT_THEME === "dark";
}

function setClientCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  setClientCookie(THEME_STORAGE_KEY, theme);
  setClientCookie(THEME_RESOLVED_KEY, resolved);
}
