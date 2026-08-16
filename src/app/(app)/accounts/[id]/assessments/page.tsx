import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getOrganizationOverview } from "@/server/services/organization-overview";

export default async function OrganizationAssessmentsPage({
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
      <h2 className="text-sm font-semibold">Assessments</h2>
      <p className="mt-1 text-sm text-muted">
        Organization-level assessment history. Project-specific scores live
        inside each project.
      </p>
      {overview.assessments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No assessments have been completed for this organization.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {overview.assessments.map((assessment) => (
            <li
              key={assessment.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              <span>Assessment {formatDate(assessment.createdAt)}</span>
              <Badge>{assessment.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
