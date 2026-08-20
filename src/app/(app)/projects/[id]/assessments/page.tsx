import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import { toUtcDate } from "@/lib/format";
import { playbookLabel } from "@/lib/projects";
import { listProjectAssessments } from "@/server/services/assessments";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectAssessmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const assessments = await listProjectAssessments(session.tenantId, id);
  const primaryPlatform =
    overview.platforms[0]?.platformType ?? overview.project.platformType;
  const playbook = playbookLabel(
    overview.project.projectType,
    primaryPlatform ? platformLabel(primaryPlatform) : null,
  );
  const hasRun = assessments.some(
    (assessment) => assessment.status === "COMPLETE",
  );

  return (
    <AssessmentViews
      assessments={assessments.map((assessment) => ({
        id: assessment.id,
        href: `/projects/${id}/intelligence?assessment=${assessment.id}`,
        title: playbook,
        status: assessment.status,
        score: assessment.summary?.overallScore ?? null,
        createdAt: toUtcDate(assessment.createdAt).toISOString(),
      }))}
      actions={
        <AssessmentRunForm
          projectId={id}
          label={hasRun ? "Run again" : "Run intelligence"}
        />
      }
    />
  );
}
