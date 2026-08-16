"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SIDEBAR_STORAGE_KEY,
  applySidebarPreference,
  isSidebarPreference,
  type SidebarPreference,
} from "@/lib/layout/sidebar";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <Icon>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </Icon>
  );
}

function AccountsIcon() {
  return (
    <Icon>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </Icon>
  );
}

function AssessmentsIcon() {
  return (
    <Icon>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </Icon>
  );
}

function SettingsIcon() {
  return (
    <Icon>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

function PanelLeftIcon() {
  return (
    <Icon>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </Icon>
  );
}

function PanelRightIcon() {
  return (
    <Icon>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
    </Icon>
  );
}

const nav = [
  { href: "/accounts", label: "Organizations", icon: AccountsIcon },
  { href: "/dashboard", label: "Projects", icon: ProjectsIcon },
  { href: "/assessments", label: "Assessments", icon: AssessmentsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preference, setPreference] = useState<SidebarPreference>("expanded");

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const next = isSidebarPreference(stored) ? stored : "expanded";
    setPreference(next);
    applySidebarPreference(next);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function setLayout(next: SidebarPreference) {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next);
    setPreference(next);
    applySidebarPreference(next);
    setMenuOpen(false);
  }

  return (
    <aside className="app-sidebar fixed bottom-0 left-0 top-12 hidden border-r border-sidebar-border bg-sidebar px-2 py-3 text-sidebar-fg md:flex md:flex-col">
      <nav className="flex flex-1 flex-col gap-[6.5px]">
        {nav.map((item) => {
          const NavIcon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`sidebar-nav-link flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                active
                  ? "bg-sidebar-hover text-sidebar-fg"
                  : "text-sidebar-fg/75 hover:bg-sidebar-hover hover:text-sidebar-fg"
              }`}
            >
              <NavIcon />
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div ref={menuRef} className="sidebar-toggle-wrap relative mt-auto self-start">
        <button
          type="button"
          className="sidebar-toggle inline-flex items-center rounded-md p-1 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Sidebar layout"
          title="Sidebar layout"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sidebar-icon-open">
            <PanelLeftIcon />
          </span>
          <span className="sidebar-icon-closed">
            <PanelRightIcon />
          </span>
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Sidebar layout"
            className="sidebar-layout-menu absolute bottom-full left-0 z-30 mb-2 w-48 rounded-md border border-border bg-surface p-1 text-foreground shadow-sm"
          >
            <MenuItem
              label="Expanded"
              active={preference === "expanded"}
              onSelect={() => setLayout("expanded")}
            />
            <MenuItem
              label="Collapsed"
              active={preference === "collapsed"}
              onSelect={() => setLayout("collapsed")}
            />
            <MenuItem
              label="Expand on hover"
              active={preference === "hover"}
              onSelect={() => setLayout("hover")}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function MenuItem({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {label}
      {active ? <span className="text-accent">✓</span> : null}
    </button>
  );
}
