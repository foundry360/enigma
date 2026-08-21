import { notFound } from "next/navigation";
import { SalesforceConnections } from "@/components/accounts/salesforce-connections";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { serializeDate } from "@/lib/format";
import { isSalesforceConfigured } from "@/modules/connectors/salesforce";
import { getOrganizationOverview } from "@/server/services/organization-overview";

export default async function OrganizationPlatformsPage({
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
      title="Platforms"
      description="Connect a Salesforce org to inventory objects, fields, and automations. Enigma does not pull customer records."
    >
      <SalesforceConnections
        organizationId={id}
        configured={isSalesforceConfigured()}
        connections={overview.connections.map((connection) => ({
          id: connection.id,
          platformType: connection.platformType,
          status: connection.status,
          externalOrgId: connection.externalOrgId,
          externalOrgName: connection.externalOrgName,
          updatedAt: serializeDate(connection.updatedAt),
        }))}
      />
    </PageFrame>
  );
}
