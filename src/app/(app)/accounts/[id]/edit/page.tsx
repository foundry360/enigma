import { notFound } from "next/navigation";
import { EditAccountForm } from "@/components/accounts/edit-account-form";
import { requireSession } from "@/lib/auth/session";
import { getAccount } from "@/server/services/accounts";

export default async function EditOrganizationPage({
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
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-4 text-sm font-semibold">Edit organization</h2>
      <EditAccountForm
        organizationId={organization.id}
        name={organization.name}
        industry={organization.industry}
        organizationType={organization.organizationType}
        employeeRange={organization.employeeRange}
        primaryContact={organization.primaryContact}
        customerStatus={organization.customerStatus}
      />
    </section>
  );
}
