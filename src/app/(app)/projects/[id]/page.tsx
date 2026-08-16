import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import { getProject } from "@/server/services/projects";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const project = await getProject(session.tenantId, id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={project.name}
        description={platformLabel(project.platformType)}
      />
      <div className="rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center">
        <h2 className="text-sm font-semibold">Project details</h2>
        <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted">
          This page is a placeholder. Assessment, connection, and value views
          will land here.
        </p>
      </div>
    </>
  );
}
