import { OrganizationViews } from "@/components/accounts/organization-views";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { listAccounts } from "@/server/services/accounts";

export default async function AccountsPage() {
  const session = await requireSession();
  const accounts = await listAccounts(session.tenantId);
  const organizations = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    industry: account.industry,
    connectionStatus: account.connections[0]?.status ?? "Not connected",
    assessmentStatus: account.assessments[0]?.status ?? "None",
  }));

  return (
    <>
      <PageHeader title="Organizations" className="mb-[20px]" />

      <OrganizationViews organizations={organizations} />
    </>
  );
}
