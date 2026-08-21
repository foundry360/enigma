import { notFound } from "next/navigation";
import { ConnectionViews } from "@/components/projects/connection-views";
import { requireSession } from "@/lib/auth/session";
import { serializeDate } from "@/lib/format";
import { isSalesforceConfigured } from "@/modules/connectors/salesforce";
import { platformLabel } from "@/lib/platforms";
import { probeSalesforceConnection } from "@/server/services/connections";
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

  const attachedIds = new Set(
    overview.environments.map((environment) => environment.connectionId),
  );
  const connections = await Promise.all(
    overview.connections.map(async (connection) => {
      let status = connection.status;
      if (
        connection.platformType === "SALESFORCE" &&
        connection.status === "CONNECTED"
      ) {
        const live = await probeSalesforceConnection(
          session.tenantId,
          connection.id,
        );
        if (!live.ok) {
          status = live.expired ? "EXPIRED" : "ERROR";
        }
      }

      return {
        id: connection.id,
        projectId: overview.project.id,
        name:
          connection.externalOrgName ??
          `${platformLabel(connection.platformType)} environment`,
        platformType: connection.platformType,
        status,
        externalOrgId: connection.externalOrgId,
        attached: attachedIds.has(connection.id),
        updatedAt: serializeDate(connection.updatedAt),
      };
    }),
  );

  return (
    <ConnectionViews
      projectId={overview.project.id}
      organizationId={overview.project.organizationId}
      salesforceConfigured={isSalesforceConfigured()}
      salesforceStatus={query.salesforce}
      connections={connections}
    />
  );
}
