import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { OpportunityBoard } from "@/components/intelligence/opportunity-board";
import { requireSession } from "@/lib/auth/session";
import { presentOpportunities } from "@/modules/intelligence/present";
import { getProjectConsumptionSnapshots } from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectOpportunitiesPage({
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

  const snapshots = await getProjectConsumptionSnapshots(session.tenantId, id);
  const connectionId =
    snapshots.latest?.assessment.connectionId ??
    overview.environments[0]?.connectionId ??
    overview.connections.find((connection) => connection.status === "CONNECTED")
      ?.id ??
    null;
  const org = connectionId
    ? await getConnectionOrgProfile(session.tenantId, connectionId)
    : null;
  const current = (snapshots.latest?.judgments ?? []).filter(
    (item) => item.kind === "opportunity",
  );
  const prior = (snapshots.previous?.judgments ?? []).filter(
    (item) => item.kind === "opportunity",
  );
  const items = presentOpportunities(
    current,
    prior.length > 0
      ? prior.map((item) => ({
          key: item.key,
          title: item.title,
          score: item.score,
        }))
      : null,
  );
  const hasRun = snapshots.complete.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <AssessmentRunForm
          projectId={id}
          label={hasRun ? "Run again" : "Run intelligence"}
          orgName={org?.name ?? overview.connections[0]?.externalOrgName}
          orgId={org?.orgId ?? overview.connections[0]?.externalOrgId}
        />
      </div>

      {items.length > 0 ? (
        <OpportunityBoard
          assessmentId={snapshots.latest?.assessment.id}
          items={items.map((item) => ({
            ...item,
            status:
              snapshots.latest?.assessment.summary?.candidates?.[item.key] ??
              "candidate",
          }))}
        />
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Run intelligence to generate opportunity candidates.
        </p>
      )}
    </div>
  );
}
