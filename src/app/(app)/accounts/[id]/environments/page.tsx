import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import { getOrganizationOverview } from "@/server/services/organization-overview";

export default async function OrganizationEnvironmentsPage({
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
      <h2 className="text-sm font-semibold">Environments</h2>
      <p className="mt-1 text-sm text-muted">
        An environment is a connected instance inside a platform, such as
        production or sandbox. It is not the customer organization.
      </p>
      {overview.connections.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No environments connected. Platform adapters will attach environments
          here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {overview.connections.map((connection) => (
            <li
              key={connection.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">
                  {connection.externalOrgName ??
                    `${platformLabel(connection.platformType)} environment`}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {platformLabel(connection.platformType)}
                  {connection.externalOrgId
                    ? ` · ${connection.externalOrgId}`
                    : ""}
                </p>
              </div>
              <Badge>{connection.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
