import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { AssessmentViews } from "@/components/assessments/assessment-views";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
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
  const connectedOrg =
    overview.connections.find((connection) => connection.status === "CONNECTED") ??
    overview.connections[0] ??
    null;

  return (
    <AssessmentViews
      assessments={assessments.map((assessment) => ({
        id: assessment.id,
        href: `/projects/${id}/intelligence`,
        title: playbook,
        status: assessment.status,
        score: assessment.summary?.overallScore ?? null,
        createdAt: assessment.createdAt,
      }))}
      actions={
        <AssessmentRunForm
          projectId={id}
          label="Start Assessment"
          orgName={connectedOrg?.externalOrgName}
          orgId={connectedOrg?.externalOrgId}
        />
      }
    />
  );
}
