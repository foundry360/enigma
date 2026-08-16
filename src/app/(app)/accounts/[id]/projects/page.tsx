import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
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
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Projects</h2>
        <Link
          href={`/projects/new?organizationId=${id}`}
          className={buttonClassName("primary", "gap-1")}
        >
          <span aria-hidden="true">+</span>
          Create project
        </Link>
      </div>
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
    </section>
  );
}
