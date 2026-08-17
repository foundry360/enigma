import { redirect } from "next/navigation";
import { ProjectViews } from "@/components/projects/project-views";
import { ProjectIcon } from "@/components/ui/entity-icons";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { getAccountSelection } from "@/server/services/accounts";
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

  const projects = await listProjects(session.tenantId, selected.id);

  return (
    <PageFrame
      title="Projects"
      description={`Transformation projects for ${selected.name}.`}
      icon={<ProjectIcon size={20} />}
    >
      <ProjectViews
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          projectType: project.projectType,
          status: project.status,
          priority: project.priority,
        }))}
      />
    </PageFrame>
  );
}
