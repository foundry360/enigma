import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
import { requireSession } from "@/lib/auth/session";
import {
  listAccountChoices,
  resolveSelectedAccount,
} from "@/server/services/accounts";
import { getProfileAvatarUrl } from "@/server/services/profile";
import { listProjects } from "@/server/services/projects";
import {
  getTenant,
  getUserProfile,
  listTenantUsers,
} from "@/server/services/users";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const [user, tenant, accounts, users, projects] = await Promise.all([
    getUserProfile(session.tenantId, session.userId),
    getTenant(session.tenantId),
    listAccountChoices(session.tenantId),
    listTenantUsers(session.tenantId),
    listProjects(session.tenantId),
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
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        organizationId: project.organizationId,
        status: project.status,
      }))}
      users={users}
      currentUserId={session.userId}
    >
      {children}
    </AppShell>
  );
}
