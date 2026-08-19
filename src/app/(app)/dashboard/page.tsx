import { redirect } from "next/navigation";
import { ProjectViews } from "@/components/projects/project-views";
import { requireSession } from "@/lib/auth/session";
import { getAccountSelection } from "@/server/services/accounts";
import { listRecentProjectUpdates } from "@/server/services/audit";
import { listProjects } from "@/server/services/projects";

export default async function DashboardPage() {
  const session = await requireSession();
  const { selected } = await getAccountSelection(
    session.tenantId,
    session.userId,
  );

  if (!selected) {
    redirect("/accounts");
  }

  const [projects, updates] = await Promise.all([
    listProjects(session.tenantId, selected.id),
    listRecentProjectUpdates(session.tenantId, selected.id),
  ]);

  return (
    <ProjectViews
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        projectType: project.projectType,
        platformType: project.platformType,
        status: project.status,
        priority: project.priority,
        createdAt: project.createdAt,
      }))}
      updates={
        updates.length > 0
          ? updates
          : projects
              .filter((project) => {
                const at = new Date(project.updatedAt).getTime();
                return at >= Date.now() - 30 * 24 * 60 * 60 * 1000;
              })
              .slice(0, 20)
              .map((project) => ({
                id: project.id,
                projectId: project.id,
                projectName: project.name,
                label: "Project updated",
                at: project.updatedAt,
              }))
      }
    />
  );
}
