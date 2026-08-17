import { notFound } from "next/navigation";
import { EditAccountForm } from "@/components/accounts/edit-account-form";
import { OrganizationDangerZone } from "@/components/accounts/organization-danger-zone";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { getAccount } from "@/server/services/accounts";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const organization = await getAccount(session.tenantId, id);

  if (!organization) {
    notFound();
  }

  return (
    <PageFrame
      title="Organization Settings"
      description="Update this organization's profile details."
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <EditAccountForm
          organizationId={organization.id}
          name={organization.name}
          industry={organization.industry}
          organizationType={organization.organizationType}
          employeeRange={organization.employeeRange}
          primaryContact={organization.primaryContact}
          customerStatus={organization.customerStatus}
        />
        <OrganizationDangerZone
          organizationId={organization.id}
          name={organization.name}
          disabled={organization.disabled}
        />
      </div>
    </PageFrame>
  );
}
