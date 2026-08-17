import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
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
      description="Platforms are technology systems used by this organization. Salesforce is one adapter, not the organization."
    >
      {overview.landscape.length === 0 ? (
        <p className="text-sm text-muted">
          No platforms connected. Connect your first platform to begin building
          the organization&apos;s technology landscape.
        </p>
      ) : (
        <ul className="space-y-2">
          {overview.landscape.map((platform) => (
            <li
              key={platform.platformType}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{platform.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {platform.environments} environments
                  {platform.lastSync
                    ? ` · Last sync ${formatDate(platform.lastSync)}`
                    : ""}
                </p>
              </div>
              <Badge>{platform.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
