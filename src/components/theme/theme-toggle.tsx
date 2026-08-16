"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
  themes,
  type Theme,
} from "@/lib/theme/theme";

const labels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Auto",
};

function subscribe(onStoreChange: () => void) {
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener("enigma-theme", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("enigma-theme", onChange);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function setTheme(next: Theme) {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event("enigma-theme"));
  }

  return (
    <div
      className={`inline-flex rounded-md border border-border bg-surface-2 p-0.5 ${compact ? "" : "w-full"}`}
      role="group"
      aria-label="Color theme"
    >
      {themes.map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
              compact ? "" : "flex-1"
            } ${
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
