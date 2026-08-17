"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CreateOrganizationProvider } from "@/components/accounts/create-organization-modal";
import { AppHeader } from "@/components/layout/app-header";
import {
  SyncSelectedOrganization,
  type HeaderProject,
} from "@/components/layout/project-switcher";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateProjectProvider } from "@/components/projects/create-project-modal";
import { isWorkspaceSigned } from "@/lib/layout/sidebar";

export function AppShell({
  tenantName,
  userName,
  avatarUrl,
  accounts,
  selectedAccountId,
  projects,
  users,
  currentUserId,
  connections,
  children,
}: {
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  accounts: { id: string; name: string }[];
  selectedAccountId?: string | null;
  projects: HeaderProject[];
  users: { id: string; name: string }[];
  currentUserId: string;
  connections: {
    id: string;
    organizationId: string;
    platformType: string;
    status: string;
    externalOrgName: string | null;
  }[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const signed = isWorkspaceSigned(pathname, selectedAccountId);

  return (
    <CreateOrganizationProvider>
      <CreateProjectProvider
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        users={users}
        currentUserId={currentUserId}
        connections={connections}
      >
        <div
          className={`min-h-full bg-background${signed ? "" : " workspace-unsigned"}`}
        >
          <SyncSelectedOrganization
            projects={projects}
            selectedAccountId={selectedAccountId}
          />
          <AppHeader
            tenantName={tenantName}
            userName={userName}
            avatarUrl={avatarUrl}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            projects={projects}
            showOrganizationNav={signed}
          />
          {signed ? <Sidebar /> : null}
          <div className="app-main">
            <main className="w-full px-12 py-4 sm:px-16 lg:px-24">{children}</main>
          </div>
        </div>
      </CreateProjectProvider>
    </CreateOrganizationProvider>
  );
}
