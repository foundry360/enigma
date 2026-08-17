import { notFound } from "next/navigation";
import { ProjectPageFrame } from "@/components/projects/project-page-frame";
import {
  AssessmentStatusMark,
  assessmentLabel,
} from "@/components/ui/status-dot";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
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

  return (
    <ProjectPageFrame
      title="Assessments"
      description={`Discovery and scoring are not implemented yet. This run is the container for ${playbook}.`}
    >
      {assessments.length === 0 ? (
        <div className="rounded-md border border-border bg-background px-4 py-8 text-center">
          <p className="text-sm text-muted">
            No assessment has been started for this project.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {assessments.map((assessment) => (
            <li
              key={assessment.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{playbook}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Started {formatDate(assessment.createdAt)}
                </p>
              </div>
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
    </ProjectPageFrame>
  );
}
