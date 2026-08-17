import { notFound } from "next/navigation";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { ProjectDangerZone } from "@/components/projects/project-danger-zone";
import { ProjectPageFrame } from "@/components/projects/project-page-frame";
import { requireSession } from "@/lib/auth/session";
import { getProjectOverview } from "@/server/services/projects";
import { listTenantUsers } from "@/server/services/users";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const [overview, users] = await Promise.all([
    getProjectOverview(session.tenantId, id),
    listTenantUsers(session.tenantId),
  ]);

  if (!overview) {
    notFound();
  }

  return (
    <ProjectPageFrame
      title="Project Settings"
      description="Update this project's intent, ownership, and details."
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <EditProjectForm
          project={overview.project}
          platforms={overview.platforms.map((platform) => platform.platformType)}
          users={users}
        />
        <ProjectDangerZone
          projectId={overview.project.id}
          name={overview.project.name}
        />
      </div>
    </ProjectPageFrame>
  );
}
