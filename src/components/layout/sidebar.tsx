"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { clearSelectedOrganizationAction } from "@/app/actions/accounts";
import { ProjectIcon } from "@/components/ui/entity-icons";
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
  return <ProjectIcon size={18} className="shrink-0" />;
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

function OverviewIcon() {
  return <Home size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />;
}

function ConnectionsIcon() {
  return (
    <Icon>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  );
}

function IntelligenceIcon() {
  return (
    <Icon>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </Icon>
  );
}

function OpportunitiesIcon() {
  return (
    <Icon>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icon>
  );
}

function BusinessCaseIcon() {
  return (
    <Icon>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Icon>
  );
}

function DeploymentIcon() {
  return (
    <Icon>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Icon>
  );
}

function OutcomesIcon() {
  return (
    <Icon>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Icon>
  );
}

function ProjectSettingsIcon() {
  return (
    <Icon>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

function OrganizationSettingsIcon() {
  return (
    <Icon>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <circle cx="12" cy="16.5" r="2" />
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
];

function projectNavContext(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = match?.[1];

  if (!projectId || projectId === "new") {
    return null;
  }

  return {
    projectId,
    items: [
      {
        href: `/projects/${projectId}`,
        label: "Project Overview",
        icon: OverviewIcon,
        exact: true,
      },
      {
        href: `/projects/${projectId}/intelligence`,
        label: "Org Intelligence",
        icon: IntelligenceIcon,
        exact: false,
      },
      {
        href: `/projects/${projectId}/assessments`,
        label: "Assessments",
        icon: AssessmentsIcon,
        exact: false,
      },
      {
        href: `/projects/${projectId}/opportunities`,
        label: "Opportunities",
        icon: OpportunitiesIcon,
        exact: false,
      },
      {
        href: `/projects/${projectId}/business-case`,
        label: "Business Case",
        icon: BusinessCaseIcon,
        exact: false,
      },
      {
        href: `/projects/${projectId}/deployment`,
        label: "Deployment",
        icon: DeploymentIcon,
        exact: false,
      },
      {
        href: `/projects/${projectId}/outcomes`,
        label: "Outcomes",
        icon: OutcomesIcon,
        exact: false,
      },
    ],
    settingsHref: `/projects/${projectId}/settings`,
    connectionsHref: `/projects/${projectId}/connections`,
  };
}

function organizationNavContext(pathname: string) {
  const match = pathname.match(/^\/accounts\/([^/]+)(?:\/settings)?$/);
  const organizationId = match?.[1];

  if (!organizationId || organizationId === "new") {
    return null;
  }

  return {
    organizationId,
    href: `/accounts/${organizationId}/settings`,
    active: pathname.endsWith("/settings"),
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const projectNav = projectNavContext(pathname);
  const organizationNav = organizationNavContext(pathname);
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
        {nav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavActive(pathname, item.href)}
            onNavigate={
              item.href === "/accounts"
                ? () => {
                    void clearSelectedOrganizationAction();
                  }
                : undefined
            }
          />
        ))}
        {projectNav ? (
          <>
            <div className="mx-2 my-1 border-t border-sidebar-border" />
            <p className="sidebar-label mx-2 mt-0.5 px-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-muted">
              Project Details
            </p>
            {projectNav.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                }
              />
            ))}
            <div className="mx-2 my-1 border-t border-sidebar-border" />
            <NavLink
              href={projectNav.connectionsHref}
              label="Connections"
              icon={ConnectionsIcon}
              active={pathname.startsWith(projectNav.connectionsHref)}
            />
            <NavLink
              href={projectNav.settingsHref}
              label="Project Settings"
              icon={ProjectSettingsIcon}
              active={pathname.startsWith(projectNav.settingsHref)}
            />
          </>
        ) : null}
        {organizationNav ? (
          <>
            <div className="mx-2 my-1 border-t border-sidebar-border" />
            <NavLink
              href={organizationNav.href}
              label="Organization Settings"
              icon={OrganizationSettingsIcon}
              active={organizationNav.active}
            />
          </>
        ) : null}
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

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href || pathname.startsWith("/projects/");
  }

  if (href === "/accounts") {
    return (
      pathname === "/accounts" ||
      (/^\/accounts\/[^/]+$/.test(pathname) && !pathname.endsWith("/settings"))
    );
  }

  return pathname === href || pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  icon: NavIcon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: () => ReactNode;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={label}
      onClick={onNavigate}
      className={`sidebar-nav-link flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active
          ? "bg-sidebar-hover text-sidebar-fg"
          : "text-sidebar-fg/75 hover:bg-sidebar-hover hover:text-sidebar-fg"
      }`}
    >
      <NavIcon />
      <span className="sidebar-label">{label}</span>
    </Link>
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
      {active ? <span className="text-connected">✓</span> : null}
    </button>
  );
}
