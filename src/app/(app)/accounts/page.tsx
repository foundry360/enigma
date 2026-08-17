import { OrganizationViews } from "@/components/accounts/organization-views";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { listAccounts } from "@/server/services/accounts";

export default async function AccountsPage() {
  const session = await requireSession();
  const accounts = await listAccounts(session.tenantId);
  const organizations = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    industry: account.industry,
    organizationType: account.organizationType,
    employeeRange: account.employeeRange,
    primaryContact: account.primaryContact,
    customerStatus: account.customerStatus,
    connectionStatus: account.connections[0]?.status ?? "Not connected",
    environmentCount: account.connections.length,
    projectCount: account.projectCount,
    assessmentStatus: account.assessments[0]?.status ?? "None",
    updatedAt: account.updatedAt,
  }));

  return (
    <PageFrame
      title="Organizations"
      description="All customer companies you assess and run projects for."
    >
      <OrganizationViews organizations={organizations} />
    </PageFrame>
  );
}
