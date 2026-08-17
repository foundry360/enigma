import { notFound } from "next/navigation";
import { ProjectPageFrame } from "@/components/projects/project-page-frame";
import { requireSession } from "@/lib/auth/session";
import { getProjectOverview } from "@/server/services/projects";

export async function ProjectPlaceholderPage({
  projectId,
  title,
  description,
}: {
  projectId: string;
  title: string;
  description: string;
}) {
  const session = await requireSession();
  const overview = await getProjectOverview(session.tenantId, projectId);

  if (!overview) {
    notFound();
  }

  return (
    <ProjectPageFrame title={title} description={description}>
      <div className="rounded-md border border-border bg-background px-4 py-8 text-center">
        <p className="text-sm text-muted">Not implemented yet.</p>
      </div>
    </ProjectPageFrame>
  );
}
