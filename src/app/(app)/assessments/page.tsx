import { redirect } from "next/navigation";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { requireSession } from "@/lib/auth/session";
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
          ? `/projects/${assessment.projectId}/intelligence`
          : `/accounts/${assessment.organizationId}/assessments`,
        title: assessment.projectName ?? "Assessment",
        organizationName: assessment.organizationName,
        status: assessment.status,
        score: assessment.summary?.overallScore ?? null,
        createdAt: assessment.createdAt,
      }))}
    />
  );
}
