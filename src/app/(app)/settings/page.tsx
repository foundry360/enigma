import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
  });

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace"
        description="Tenant isolation is enforced on the server. Salesforce credentials will never be stored in the browser."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardLabel>Tenant</CardLabel>
          <p className="mt-3 font-serif text-2xl">{tenant?.name}</p>
          <p className="mt-1 text-sm text-muted">{tenant?.slug}</p>
        </Card>
        <Card>
          <CardLabel>Database</CardLabel>
          <p className="mt-3 font-serif text-2xl">Supabase</p>
          <p className="mt-1 text-sm text-muted">ppceqvoyexpkguzeseen · us-east-2</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Prisma talks to Postgres directly. Tenant tables are not exposed
            through the Supabase anon API.
          </p>
        </Card>
        <Card>
          <CardLabel>Salesforce connection</CardLabel>
          <p className="mt-3 font-serif text-2xl">Not configured</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            OAuth uses a Connected App and a server-side callback. See
            docs/SALESFORCE.md for the Sprint 2 approach.
          </p>
        </Card>
      </div>
    </>
  );
}
