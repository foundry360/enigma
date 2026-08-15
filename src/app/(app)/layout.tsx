import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const [user, tenant] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.userId, tenantId: session.tenantId },
      select: { name: true },
    }),
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    }),
  ]);

  return (
    <AppShell
      session={session}
      userName={user?.name ?? "User"}
      tenantName={tenant?.name ?? "Workspace"}
    >
      {children}
    </AppShell>
  );
}
