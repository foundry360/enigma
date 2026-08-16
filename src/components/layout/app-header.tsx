import Link from "next/link";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { ProfileMenu } from "@/components/layout/profile-menu";

export function AppHeader({
  tenantName,
  userName,
  avatarUrl,
  accounts,
  selectedAccountId,
}: {
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  accounts: { id: string; name: string }[];
  selectedAccountId?: string | null;
}) {
  return (
    <header className="app-header fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between overflow-visible border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-1">
        <Link href="/accounts" className="text-sm font-semibold tracking-tight">
          Enigma
        </Link>
        <span className="px-1 text-muted">/</span>
        <AccountSwitcher
          accounts={accounts}
          selectedId={selectedAccountId}
        />
      </div>
      <ProfileMenu
        userName={userName}
        tenantName={tenantName}
        avatarUrl={avatarUrl}
      />
    </header>
  );
}
