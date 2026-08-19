"use client";

import { useEffect, type ReactNode } from "react";
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
  children: ReactNode;
}) {
  const pathname = usePathname();
  const signed = isWorkspaceSigned(pathname, selectedAccountId);
  const fillViewport = pathname.includes("/intelligence");

  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
    };
  }, []);

  return (
    <CreateOrganizationProvider>
      <CreateProjectProvider
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        users={users}
        currentUserId={currentUserId}
      >
        <div
          className={`h-dvh overflow-hidden bg-background${signed ? "" : " workspace-unsigned"}`}
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
            <main className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4 lg:px-6">
              <div
                className={`flex min-h-0 flex-1 flex-col ${
                  fillViewport ? "overflow-hidden" : "overflow-y-auto"
                }`}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </CreateProjectProvider>
    </CreateOrganizationProvider>
  );
}
