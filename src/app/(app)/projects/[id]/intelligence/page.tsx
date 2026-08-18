import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { OpportunityCandidates } from "@/components/intelligence/opportunity-candidates";
import { ReadinessCategories } from "@/components/intelligence/readiness-categories";
import { ScoreRing } from "@/components/ui/score-ring";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { opportunityDefinition } from "@/modules/intelligence/opportunities";
import { splitSignalCopy } from "@/modules/intelligence/signals";
import { overallScore, signalState } from "@/modules/intelligence/score";
import {
  getLatestAssessmentDetail,
  getProjectAssessmentDetail,
} from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { getProjectOverview } from "@/server/services/projects";

const stateLabel = {
  strong: "Strong",
  mixed: "Mixed",
  weak: "Weak",
} as const;

export default async function ProjectIntelligencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assessment?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const detail = query.assessment
    ? await getProjectAssessmentDetail(
        session.tenantId,
        id,
        query.assessment,
      )
    : await getLatestAssessmentDetail(session.tenantId, id);

  if (query.assessment && !detail) {
    notFound();
  }
  const connectionId =
    detail?.assessment.connectionId ??
    overview.environments[0]?.connectionId ??
    overview.connections.find((connection) => connection.status === "CONNECTED")
      ?.id ??
    null;
  const org = connectionId
    ? await getConnectionOrgProfile(session.tenantId, connectionId)
    : null;
  const signals =
    detail?.judgments.filter((item) => item.kind === "dimension") ?? [];
  const candidates =
    detail?.judgments.filter((item) => item.kind === "opportunity") ?? [];
  const complete = detail?.assessment.status === "COMPLETE";
  const strength = complete
    ? (detail.assessment.summary?.overallScore ?? overallScore(signals))
    : null;
  const sources = [
    ...new Set((detail?.traces ?? []).map((trace) => trace.tool)),
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Intelligence
          </h1>
          <AssessmentRunForm
            projectId={id}
            label={complete ? "Run again" : "Run intelligence"}
            orgName={org?.name}
            orgId={org?.orgId}
          />
        </div>
        <div className="grid gap-6 border-t border-border p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:p-6">
          <div className="flex min-h-56 items-center justify-center gap-5 rounded-md border border-border bg-background px-4">
            <ScoreRing score={strength} size="xl" showBadge={false} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Signal strength</p>
              <p className="mt-1 text-sm text-muted">
                {strength == null ? "—" : stateLabel[signalState(strength)]}
              </p>
            </div>
          </div>
          <dl className="divide-y divide-border">
            <MetaRow label="Environment">
              {org?.name ?? "Not connected"}
            </MetaRow>
            <MetaRow label="Date">
              {detail ? formatDateTime(detail.assessment.createdAt) : "—"}
            </MetaRow>
            <MetaRow label="Status">
              {detail?.assessment.status ?? "Not run"}
            </MetaRow>
            <MetaRow label="Sources">
              {sources.length > 0 ? sources.join(", ") : "—"}
            </MetaRow>
            <MetaRow label="Facts">{detail?.traces.length ?? 0}</MetaRow>
            <MetaRow label="Signals">{complete ? signals.length : 0}</MetaRow>
            <MetaRow label="Candidates">
              {complete ? candidates.length : 0}
            </MetaRow>
          </dl>
        </div>
      </section>

      {complete && signals.length > 0 ? (
        <ReadinessCategories
          title="Business signals"
          tone="signal"
          items={signals.map((item) => {
            const copy = splitSignalCopy(item.reason);
            return {
              id: item.id,
              title: item.title,
              score: item.score,
              evidence: item.evidence,
              reason: copy.meaning,
              consumption: copy.consumption,
              risk: item.risk,
              recommendation: item.recommendation,
            };
          })}
        />
      ) : null}

      {complete && candidates.length > 0 ? (
        <OpportunityCandidates
          reviewHref={`/projects/${id}/opportunities`}
          items={candidates.map((candidate) => {
            const definition = opportunityDefinition(candidate.key);
            return {
              id: candidate.id,
              title: candidate.title,
              strength: signalState(candidate.score),
              process: definition?.process ?? "Agent workflow",
              supportedBy: definition
                ? definition.requiredSignals.map(
                    (key) =>
                      signals.find((item) => item.key === key)?.title ?? key,
                  )
                : [],
              consumptionDrivers: definition?.consumptionDrivers ?? [],
              valueDrivers: definition?.valueDrivers ?? [],
            };
          })}
        />
      ) : !complete ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Run intelligence to see what Enigma can determine from the connected
          environment.
        </p>
      ) : null}
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
