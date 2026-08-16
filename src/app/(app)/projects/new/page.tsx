import { redirect } from "next/navigation";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { getAccountSelection } from "@/server/services/accounts";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await requireSession();
  const { organizationId } = await searchParams;
  const { accounts, selected } = await getAccountSelection(
    session.tenantId,
    session.userId,
  );

  if (accounts.length === 0) {
    redirect("/accounts?new=1");
  }

  const preferred =
    accounts.find((account) => account.id === organizationId) ?? selected;

  return (
    <>
      <PageHeader
        title="New project"
        description="Name the engagement and choose the platform to assess."
      />
      <CreateProjectForm
        accounts={accounts}
        selectedAccountId={preferred?.id}
      />
    </>
  );
}
