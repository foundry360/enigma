import { redirect } from "next/navigation";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { requireSession } from "@/lib/auth/session";
import { toUtcDate } from "@/lib/format";
import { getAccountSelection } from "@/server/services/accounts";
import { listTenantAssessments } from "@/server/services/assessments";

export default async function AssessmentsPage() {
  const session = await requireSession();
  const { selected } = await getAccountSelection(
    session.tenantId,
    session.userId,
  );

  if (!selected) {
    redirect("/accounts");
  }

  const assessments = await listTenantAssessments(
    session.tenantId,
    selected.id,
  );

  return (
    <AssessmentViews
      assessments={assessments.map((assessment) => ({
        id: assessment.id,
        href: assessment.projectId
          ? `/projects/${assessment.projectId}/intelligence?assessment=${assessment.id}`
          : `/accounts/${assessment.organizationId}/assessments`,
        title: assessment.projectName ?? "Intelligence run",
        organizationName: assessment.organizationName,
        status: assessment.status,
        score: assessment.summary?.overallScore ?? null,
        createdAt: toUtcDate(assessment.createdAt).toISOString(),
      }))}
    />
  );
}
