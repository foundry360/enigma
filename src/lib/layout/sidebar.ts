export const SIDEBAR_STORAGE_KEY = "enigma-sidebar";

export const sidebarPreferences = ["expanded", "collapsed", "hover"] as const;

export type SidebarPreference = (typeof sidebarPreferences)[number];

export function isSidebarPreference(
  value: string | null | undefined,
): value is SidebarPreference {
  return (
    value === "expanded" || value === "collapsed" || value === "hover"
  );
}

export function isWorkspaceSigned(
  pathname: string,
  selectedAccountId?: string | null,
) {
  return Boolean(selectedAccountId) && pathname !== "/accounts";
}

export function applySidebarPreference(preference: SidebarPreference | null) {
  const next = preference ?? "expanded";
  document.documentElement.classList.toggle(
    "sidebar-collapsed",
    next === "collapsed",
  );
  document.documentElement.classList.toggle("sidebar-hover", next === "hover");
  document.cookie = `${SIDEBAR_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
}
