import { notFound } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { requireSession } from "@/lib/auth/session";
import { formatLastActivity } from "@/lib/format";
import { getOrganizationOverview } from "@/server/services/organization-overview";

export default async function OrganizationActivityPage({
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
      title="Activity"
      description="Recent changes for this organization and its projects."
    >
      {overview.activity.length === 0 ? (
        <p className="text-sm text-muted">
          No recorded activity for this organization yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {overview.activity.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{event.label}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatLastActivity(event.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
