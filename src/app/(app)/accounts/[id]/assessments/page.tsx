import { notFound } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import {
  AssessmentStatusMark,
  assessmentLabel,
} from "@/components/ui/status-dot";
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
    <PageFrame
      title="Assessments"
      description="Organization-level assessment history. Project-specific scores live inside each project."
    >
      {overview.assessments.length === 0 ? (
        <p className="text-sm text-muted">
          No assessments have been completed for this organization.
        </p>
      ) : (
        <ul className="space-y-2">
          {overview.assessments.map((assessment) => (
            <li
              key={assessment.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              <span>Assessment {formatDate(assessment.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5">
                <AssessmentStatusMark status={assessment.status} />
                <span className="text-muted">
                  {assessmentLabel(assessment.status)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
