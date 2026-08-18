import { notFound } from "next/navigation";
import { ConnectionViews } from "@/components/projects/connection-views";
import { requireSession } from "@/lib/auth/session";
import { isSalesforceConfigured } from "@/modules/connectors/salesforce";
import { platformLabel } from "@/lib/platforms";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salesforce?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const connections = overview.connections;
  const attachedIds = new Set(
    overview.environments.map((environment) => environment.connectionId),
  );

  return (
    <ConnectionViews
      projectId={overview.project.id}
      organizationId={overview.project.organizationId}
      salesforceConfigured={isSalesforceConfigured()}
      salesforceStatus={query.salesforce}
      connections={connections.map((connection) => ({
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
  );
}
