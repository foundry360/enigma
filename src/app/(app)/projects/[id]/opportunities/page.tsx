import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentRunForm } from "@/components/assessments/assessment-run-form";
import { CandidateReview } from "@/components/intelligence/candidate-review";
import { OpportunityDetail } from "@/components/intelligence/opportunity-detail";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime, titleCase } from "@/lib/format";
import { getLatestAssessmentDetail } from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import {
  ensureOpportunityCandidates,
  getOpportunityCandidate,
  getProjectOpportunity,
  listProjectOpportunities,
} from "@/server/services/opportunities";
import { getProjectOverview } from "@/server/services/projects";

export default async function ProjectOpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ candidate?: string; opportunity?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const latest = await getLatestAssessmentDetail(session.tenantId, id);
  if (latest) {
    await ensureOpportunityCandidates(session.tenantId, latest.assessment.id);
  }

  const opportunities = await listProjectOpportunities(session.tenantId, id);
  const latestCandidates = latest
    ? await ensureOpportunityCandidates(session.tenantId, latest.assessment.id)
    : [];
  const openCandidates = latestCandidates.filter(
    (item) => item.status === "candidate" || item.status === "validated",
  );
  const selectedOpportunity = query.opportunity
    ? await getProjectOpportunity(session.tenantId, query.opportunity)
    : opportunities[0] && !query.candidate
      ? opportunities[0]
      : null;
  const selectedCandidate = query.candidate
    ? await getOpportunityCandidate(session.tenantId, query.candidate)
    : !selectedOpportunity
      ? openCandidates[0] ?? latestCandidates[0] ?? null
      : null;
  if (
    (selectedOpportunity && selectedOpportunity.projectId !== id) ||
    (selectedCandidate && selectedCandidate.projectId !== id)
  ) {
    notFound();
  }

  const sourceCandidate =
    selectedOpportunity
      ? await getOpportunityCandidate(
          session.tenantId,
          selectedOpportunity.candidateId,
        )
      : selectedCandidate;
  const connectionId =
    latest?.assessment.connectionId ??
    overview.environments[0]?.connectionId ??
    overview.connections.find((connection) => connection.status === "CONNECTED")
      ?.id ??
    null;
  const org = connectionId
    ? await getConnectionOrgProfile(session.tenantId, connectionId)
    : null;
  const hasRun = Boolean(latest);

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

      {opportunities.length > 0 || latestCandidates.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[30%_minmax(0,1fr)]">
          <div className="space-y-4">
            {opportunities.length > 0 ? (
              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase">
                  Opportunities
                </h2>
                <div className="space-y-1">
                  {opportunities.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${id}/opportunities?opportunity=${item.id}`}
                      className={`block rounded-md px-3 py-2.5 text-sm ${
                        selectedOpportunity?.id === item.id
                          ? "bg-surface-2 font-semibold"
                          : "hover:bg-surface-2/60"
                      }`}
                    >
                      {titleCase(item.name)}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            {latestCandidates.length > 0 ? (
              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase">
                  Candidates
                </h2>
                <div className="space-y-1">
                  {latestCandidates.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${id}/opportunities?candidate=${item.id}`}
                      className={`block rounded-md px-3 py-2.5 text-sm ${
                        selectedCandidate?.id === item.id
                          ? "bg-surface-2 font-semibold"
                          : "hover:bg-surface-2/60"
                      }`}
                    >
                      <span>{titleCase(item.name)}</span>
                      <span className="ml-2 text-xs text-muted">
                        {titleCase(item.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          {selectedOpportunity ? (
            <OpportunityDetail
              opportunity={selectedOpportunity}
              candidate={sourceCandidate}
              projectId={id}
              runDate={latest?.assessment.createdAt ?? null}
            />
          ) : selectedCandidate ? (
            <CandidateReview
              candidate={selectedCandidate}
              projectId={id}
              runDate={
                latest?.assessment.id === selectedCandidate.assessmentId
                  ? latest.assessment.createdAt
                  : selectedCandidate.createdAt
              }
            />
          ) : (
            <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              Select a candidate to review why Enigma identified it.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Run intelligence to generate opportunity candidates.
        </p>
      )}
      {selectedOpportunity ? (
        <p className="text-xs text-muted">
          Promoted {formatDateTime(selectedOpportunity.createdAt)}.
        </p>
      ) : null}
    </div>
  );
}
