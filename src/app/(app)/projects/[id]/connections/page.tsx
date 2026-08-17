import { notFound } from "next/navigation";
import { ConnectionViews } from "@/components/projects/connection-views";
import { ProjectPageFrame } from "@/components/projects/project-page-frame";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectConnectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const attachedIds = new Set(
    overview.environments.map((environment) => environment.connectionId),
  );

  return (
    <ProjectPageFrame
      title="Connections"
      description="Environments available to this project. New platforms are connected on the organization."
    >
      <ConnectionViews
        organizationId={overview.project.organizationId}
        connections={overview.connections.map((connection) => ({
          id: connection.id,
          projectId: overview.project.id,
          name:
            connection.externalOrgName ??
            `${platformLabel(connection.platformType)} environment`,
          platformType: connection.platformType,
          status: connection.status,
          externalOrgId: connection.externalOrgId,
          attached: attachedIds.has(connection.id),
          updatedAt: connection.updatedAt,
        }))}
      />
    </ProjectPageFrame>
  );
}
