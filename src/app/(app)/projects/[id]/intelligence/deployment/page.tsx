import { notFound } from "next/navigation";
import { DeploymentPanel } from "@/components/intelligence/deployment-panel";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { requireSession } from "@/lib/auth/session";
import { factsFromTraces } from "@/modules/intelligence/summarize";
import { buildOrgIntelligence } from "@/modules/intelligence/org-intelligence";
import { getLatestAssessmentDetail } from "@/server/services/assessments";
import {
  ensureBusinessCase,
  toDeploymentForecast,
} from "@/server/services/business-case";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceDeploymentPage({
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

  const [detail, assessment] = await Promise.all([
    ensureBusinessCase(session.tenantId, id),
    getLatestAssessmentDetail(session.tenantId, id),
  ]);
  const connectionId =
    assessment?.assessment.connectionId ??
    overview.environments[0]?.connectionId ??
    overview.connections.find((connection) => connection.status === "CONNECTED")
      ?.id ??
    null;
  const orgProfile = connectionId
    ? await getConnectionOrgProfile(session.tenantId, connectionId)
    : null;
  const stored = assessment?.assessment.orgIntelligence;
  const org =
    stored?.version === 1
      ? stored
      : assessment && overview.project
        ? buildOrgIntelligence(
            factsFromTraces(
              {
                projectType: overview.project.projectType,
                objective: overview.project.objective,
                outcomes: overview.project.outcomes,
              },
              assessment.traces,
            ),
            { opportunityName: detail?.lines[0]?.opportunityName ?? null },
          )
        : null;

  return (
    <IntelligencePane scroll>
      <DeploymentPanel
        projectId={id}
        forecast={toDeploymentForecast(detail, {
          org,
          environmentName: orgProfile?.name ?? org?.environment.orgName ?? null,
        })}
      />
    </IntelligencePane>
  );
}
