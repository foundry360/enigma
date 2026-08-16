import type { ReactNode } from "react";
import { CreateOrganizationProvider } from "@/components/accounts/create-organization-modal";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  tenantName,
  userName,
  avatarUrl,
  accounts,
  selectedAccountId,
  children,
}: {
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  accounts: { id: string; name: string }[];
  selectedAccountId?: string | null;
  children: ReactNode;
}) {
  return (
    <CreateOrganizationProvider>
      <div className="min-h-full bg-background">
        <AppHeader
          tenantName={tenantName}
          userName={userName}
          avatarUrl={avatarUrl}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
        />
        <Sidebar />
        <div className="app-main">
          <main className="w-full px-12 py-4 sm:px-16 lg:px-24">{children}</main>
        </div>
      </div>
    </CreateOrganizationProvider>
  );
}
