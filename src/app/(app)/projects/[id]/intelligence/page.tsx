import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { ReadinessCategories } from "@/components/intelligence/readiness-categories";
import { RiskBadge, ScoreRing } from "@/components/ui/score-ring";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { readinessRisk } from "@/modules/intelligence";
import type { OrgProfile } from "@/modules/enterprise/types";
import { getLatestAssessmentDetail } from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectIntelligencePage({
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
  const dimensions =
    detail?.judgments.filter((item) => item.kind === "dimension") ?? [];
  const opportunities =
    detail?.judgments.filter((item) => item.kind === "opportunity") ?? [];
  const complete = detail?.assessment.status === "COMPLETE";
  const score = complete ? (detail.assessment.summary?.overallScore ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org Intelligence</h1>
        </div>
        <AssessmentRunForm
          projectId={id}
          label={complete ? "Run again" : "Start assessment"}
          orgName={org?.name}
          orgId={org?.orgId}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <Card title="Organization">
          <OrgInformation org={org} />
        </Card>
        <Card
          title="Overall Readiness"
          action={<RiskBadge risk={readinessRisk(score)} />}
        >
          <div className="flex flex-col items-center text-center">
            <ScoreRing
              score={score}
              label="Overall Readiness"
              size="lg"
              showBadge={false}
            />
          </div>
        </Card>
      </div>

      {complete && dimensions.length > 0 ? (
        <ReadinessCategories
          title="Categories"
          items={dimensions.map((item) => ({
            id: item.id,
            title: item.title,
            score: item.score,
            evidence: item.evidence,
            reason: item.reason,
            risk: item.risk,
            recommendation: item.recommendation,
          }))}
        />
      ) : null}

      {complete && opportunities.length > 0 ? (
        <ReadinessCategories
          title="Opportunities"
          items={opportunities.map((item) => ({
            id: item.id,
            title: item.title,
            score: item.score,
            evidence: item.evidence,
            reason: item.reason,
            risk: item.risk,
            recommendation: item.recommendation,
          }))}
        />
      ) : null}
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrgInformation({ org }: { org: OrgProfile | null }) {
  if (!org) {
    return (
      <p className="text-sm text-muted">
        Connect a platform environment to load organization metadata.
      </p>
    );
  }

  return (
    <dl className="divide-y divide-border md:grid md:grid-cols-2 md:divide-x md:divide-y-0 md:divide-border">
      <div className="md:pr-6">
        <MetaRow label="Metadata Type">{org.metadataType}</MetaRow>
        <MetaRow label="Organization Type">
          {org.organizationType ?? "—"}
        </MetaRow>
        <MetaRow label="Name">{org.name ?? "—"}</MetaRow>
        <MetaRow label="Organization ID">{org.orgId ?? "—"}</MetaRow>
        <MetaRow label="Instance">
          {org.instanceName ?? "—"}
          {org.instanceKind !== "unknown" ? ` · ${org.instanceKind}` : ""}
        </MetaRow>
      </div>
      <div className="md:pl-6">
        <MetaRow label="Created On">{formatDateTime(org.createdAt)}</MetaRow>
        <MetaRow label="Created By">{org.createdBy ?? "—"}</MetaRow>
        <MetaRow label="Last Changed">
          {formatDateTime(org.lastModifiedAt)}
        </MetaRow>
        <MetaRow label="Last Changed By">{org.lastModifiedBy ?? "—"}</MetaRow>
        <MetaRow label="Time Zone">{org.timeZone ?? "—"}</MetaRow>
      </div>
    </dl>
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
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

