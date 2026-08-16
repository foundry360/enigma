"use client";

import { useEffect } from "react";
import {
  SIDEBAR_STORAGE_KEY,
  applySidebarPreference,
  isSidebarPreference,
} from "@/lib/layout/sidebar";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
} from "@/lib/theme/theme";

export function PreferencesSync() {
  useEffect(() => {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(isTheme(theme) ? theme : DEFAULT_THEME);

    const sidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    applySidebarPreference(
      isSidebarPreference(sidebar) ? sidebar : "expanded",
    );

    window.localStorage.removeItem("enigma-account");
    document.cookie = "enigma-account=; path=/; max-age=0";
  }, []);

  return null;
}
