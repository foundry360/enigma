import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAccountSelection } from "@/server/services/accounts";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await requireSession();
  const { organizationId } = await searchParams;
  const { accounts } = await getAccountSelection(
    session.tenantId,
    session.userId,
  );

  if (accounts.length === 0) {
    redirect("/accounts?new=1");
  }

  if (organizationId) {
    redirect(`/accounts/${organizationId}?newProject=1`);
  }

  redirect("/dashboard?newProject=1");
}
