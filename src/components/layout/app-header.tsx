"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { clearSelectedOrganizationAction } from "@/app/actions/accounts";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { GlobalSearch } from "@/components/layout/global-search";
import {
  ProjectSwitcher,
  type HeaderProject,
} from "@/components/layout/project-switcher";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { WorkspaceIcon } from "@/components/ui/entity-icons";

export function AppHeader({
  tenantName,
  userName,
  avatarUrl,
  accounts,
  selectedAccountId,
  projects,
  showOrganizationNav = false,
}: {
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  accounts: { id: string; name: string }[];
  selectedAccountId?: string | null;
  projects: HeaderProject[];
  showOrganizationNav?: boolean;
}) {
  return (
    <header className="app-header fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between overflow-visible border-b border-border bg-surface px-4 dark:bg-black">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href="/accounts"
          className="text-sm font-semibold tracking-tight"
          onClick={() => {
            void clearSelectedOrganizationAction();
          }}
        >
          Enigma
        </Link>
        <span className="px-1 text-muted">/</span>
        <span className="inline-flex min-w-0 items-center gap-[6.5px] text-[13px] font-medium">
          <WorkspaceIcon />
          <span className="truncate">{tenantName}</span>
        </span>
        {showOrganizationNav ? (
          <>
            <span className="px-1 text-muted">/</span>
            <AccountSwitcher
              accounts={accounts}
              selectedId={selectedAccountId}
            />
            <ProjectSwitcher
              projects={projects}
              selectedAccountId={selectedAccountId}
            />
          </>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2">
        <GlobalSearch />
        <Link
          href="/get-started"
          aria-label="Get started"
          title="Get started"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <ProfileMenu
          userName={userName}
          tenantName={tenantName}
          avatarUrl={avatarUrl}
        />
      </div>
    </header>
  );
}
