import { notFound } from "next/navigation";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { requireSession } from "@/lib/auth/session";
import { toUtcDate } from "@/lib/format";
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
    <AssessmentViews
      assessments={overview.assessments.map((assessment) => ({
        id: assessment.id,
        href: assessment.projectId
          ? `/projects/${assessment.projectId}/intelligence?assessment=${assessment.id}`
          : `/accounts/${id}/assessments`,
        title: "Intelligence run",
        status: assessment.status,
        score: assessment.summary?.overallScore ?? null,
        createdAt: toUtcDate(assessment.createdAt).toISOString(),
      }))}
    />
  );
}
