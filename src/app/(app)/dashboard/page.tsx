import Link from "next/link";
import { CreateOrganizationButton } from "@/components/accounts/create-organization-modal";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import { getAccountSelection } from "@/server/services/accounts";
import { listProjects } from "@/server/services/projects";

export default async function DashboardPage() {
  const session = await requireSession();
  const { accounts, selected } = await getAccountSelection(
    session.tenantId,
    session.userId,
  );
  const projects = selected
    ? await listProjects(session.tenantId, selected.id)
    : [];

  return (
    <>
      <PageHeader
        title="Projects"
        description={
          selected
            ? `Engagements for ${selected.name}.`
            : "Create a customer organization, then add a project."
        }
        actions={
          selected ? (
            <Link href="/projects/new" className={buttonClassName()}>
              New project
            </Link>
          ) : (
            <CreateOrganizationButton>New organization</CreateOrganizationButton>
          )
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="Add a customer organization"
          body="Projects belong to a customer organization. Add the company you want to assess, then create a project."
          action={
            <CreateOrganizationButton>New organization</CreateOrganizationButton>
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body={`Create a project for ${selected?.name ?? "this account"} and choose a platform.`}
          action={
            <Link href="/projects/new" className={buttonClassName()}>
              New project
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-md border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <h2 className="truncate text-sm font-semibold">{project.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {platformLabel(project.platformType)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
