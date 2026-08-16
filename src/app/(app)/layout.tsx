import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
import { requireSession } from "@/lib/auth/session";
import {
  listAccountChoices,
  resolveSelectedAccount,
} from "@/server/services/accounts";
import { getProfileAvatarUrl } from "@/server/services/profile";
import { getTenant, getUserProfile } from "@/server/services/users";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const [user, tenant, accounts] = await Promise.all([
    getUserProfile(session.tenantId, session.userId),
    getTenant(session.tenantId),
    listAccountChoices(session.tenantId),
  ]);
  const selected = resolveSelectedAccount(
    accounts,
    user?.selectedOrganizationId,
  );

  return (
    <AppShell
      userName={user?.name ?? "User"}
      tenantName={tenant?.name ?? "Partner org"}
      avatarUrl={await getProfileAvatarUrl(user?.avatarPath)}
      accounts={accounts}
      selectedAccountId={selected?.id}
    >
      {children}
    </AppShell>
  );
}
