import { notFound } from "next/navigation";
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
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Activity</h2>
      {overview.activity.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No recorded activity for this organization yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
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
    </section>
  );
}
