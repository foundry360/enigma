import { redirect } from "next/navigation";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { PageFrame } from "@/components/ui/page-frame";
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
    <PageFrame
      title="Assessments"
      description={`Assessment runs for ${selected.name}.`}
    >
      <AssessmentViews
        assessments={assessments.map((assessment) => ({
          id: assessment.id,
          href: assessment.projectId
            ? `/projects/${assessment.projectId}/assessments`
            : `/accounts/${assessment.organizationId}/assessments`,
          title: assessment.projectName ?? "Assessment",
          organizationName: assessment.organizationName,
          status: assessment.status,
          createdAt: assessment.createdAt,
        }))}
      />
    </PageFrame>
  );
}
