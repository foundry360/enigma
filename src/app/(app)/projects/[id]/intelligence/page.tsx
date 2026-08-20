import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { ReadinessCategories } from "@/components/intelligence/readiness-categories";
import { ScoreRing, strengthColors } from "@/components/ui/score-ring";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import {
  signalExplainer,
  splitSignalCopy,
} from "@/modules/intelligence/signals";
import { overallScore, signalState } from "@/modules/intelligence/score";
import {
  getLatestAssessmentDetail,
  getProjectAssessmentDetail,
} from "@/server/services/assessments";
import { ensureOpportunityCandidates } from "@/server/services/opportunities";
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
  const candidates = detail
    ? await ensureOpportunityCandidates(session.tenantId, detail.assessment.id)
    : [];
  const complete = detail?.assessment.status === "COMPLETE";
  const strength = complete
    ? (detail.assessment.summary?.overallScore ?? overallScore(signals))
    : null;

  return (
    <IntelligencePane scroll>
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:p-6">
          <div className="flex items-center justify-center gap-5 rounded-md border border-border bg-ask-thread px-4 py-6">
            <ScoreRing score={strength} size="xl" showBadge={false} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Signal Strength</p>
              <p className="mt-1 text-xs text-muted">
                How strongly this environment supports agent work, from the
                latest intelligence run.
              </p>
              <p
                className={`mt-2 text-sm ${strength == null ? "text-muted" : ""}`}
                style={
                  strength == null
                    ? undefined
                    : { color: strengthColors[signalState(strength)] }
                }
              >
                {strength == null ? "—" : stateLabel[signalState(strength)]}
              </p>
            </div>
          </div>
          <dl className="divide-y divide-border">
            <MetaRow label="Environment">
              {org?.name ?? "Not connected"}
            </MetaRow>
            <MetaRow label="Date">
              {detail ? formatDate(detail.assessment.createdAt) : "—"}
            </MetaRow>
            <MetaRow label="Facts">{detail?.traces.length ?? 0}</MetaRow>
            <MetaRow label="Signals">{complete ? signals.length : 0}</MetaRow>
            <MetaRow label="Opportunities">
              {complete ? candidates.length : 0}
            </MetaRow>
          </dl>
        </div>
      </section>

      {complete && signals.length > 0 ? (
        <ReadinessCategories
          title="Business signals"
          description="Each signal is a judgment from discovery: what it means, how it affects consumption, and what to do next."
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
              description: signalExplainer(item.key),
            };
          })}
        />
      ) : !complete ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Run intelligence to see what Enigma can determine from the connected
          environment.
        </p>
      ) : null}
    </IntelligencePane>
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
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
