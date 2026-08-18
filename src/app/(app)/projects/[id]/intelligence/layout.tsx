import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { IntelligenceAsk } from "@/components/intelligence/intelligence-ask";
import { IntelligenceTabs } from "@/components/intelligence/intelligence-tabs";
import { requireSession } from "@/lib/auth/session";
import {
  buildIntelligenceBriefing,
  suggestedAsks,
} from "@/modules/intelligence/briefing";
import { getLatestAssessmentDetail } from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { ensureOpportunityCandidates } from "@/server/services/opportunities";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const detail = await getLatestAssessmentDetail(session.tenantId, id);
  const connectionId =
    detail?.assessment.connectionId ??
    overview.environments[0]?.connectionId ??
    overview.connections.find((connection) => connection.status === "CONNECTED")
      ?.id ??
    null;
  const org = connectionId
    ? await getConnectionOrgProfile(session.tenantId, connectionId)
    : null;
  const complete = detail?.assessment.status === "COMPLETE";
  const signals =
    detail?.judgments.filter((item) => item.kind === "dimension") ?? [];
  const candidates = detail
    ? await ensureOpportunityCandidates(session.tenantId, detail.assessment.id)
    : [];
  const briefing =
    complete && detail
      ? buildIntelligenceBriefing({
          environment: org?.name ?? "Connected environment",
          status: detail.assessment.status,
          factCount: detail.traces.length,
          signals,
          candidates,
        })
      : null;

  return (
    <div className="grid h-[calc(100dvh-5rem)] min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        <section className="shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
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
          <IntelligenceTabs projectId={id} />
        </section>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
      <IntelligenceAsk
        key={`${id}:${detail?.assessment.id ?? "none"}`}
        projectId={id}
        assessmentId={detail?.assessment.id ?? null}
        ready={Boolean(complete)}
        suggestions={briefing ? suggestedAsks(briefing) : []}
      />
    </div>
  );
}
