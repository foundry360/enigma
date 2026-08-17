import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateProjectButton } from "@/components/projects/create-project-modal";
import { ProjectIcon } from "@/components/ui/entity-icons";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { formatLastActivity } from "@/lib/format";
import { getOrganizationOverview } from "@/server/services/organization-overview";

export default async function OrganizationProjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getOrganizationOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  return (
    <PageFrame
      title="Projects"
      description="Transformation initiatives for this organization."
      icon={<ProjectIcon size={20} />}
      actions={
        <CreateProjectButton organizationId={id}>
          <span aria-hidden="true">+</span>
          Create project
        </CreateProjectButton>
      }
    >
      {overview.projects.length === 0 ? (
        <p className="text-sm text-muted">No transformation projects yet.</p>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {overview.projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-md border border-border bg-background p-4 hover:bg-surface-2"
            >
              <h3 className="truncate text-sm font-semibold">{project.name}</h3>
              <p className="mt-1 text-xs text-muted">
                Last activity {formatLastActivity(project.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
