import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";
import { CandidateReview } from "@/components/intelligence/candidate-review";
import { ConfidenceIcon } from "@/components/intelligence/confidence-icon";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { OpportunityDetail } from "@/components/intelligence/opportunity-detail";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { formatDateTime, titleCase } from "@/lib/format";
import { getLatestAssessmentDetail } from "@/server/services/assessments";
import {
  ensureOpportunityCandidates,
  getOpportunityCandidate,
  getProjectOpportunity,
  listProjectOpportunities,
} from "@/server/services/opportunities";
import { getBusinessCase } from "@/server/services/business-case";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceOpportunitiesPage({
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

  const [opportunities, businessCase] = await Promise.all([
    listProjectOpportunities(session.tenantId, id),
    getBusinessCase(session.tenantId, id),
  ]);
  const latestCandidates = latest
    ? await ensureOpportunityCandidates(session.tenantId, latest.assessment.id)
    : [];
  const opportunityByCandidateId = new Map(
    opportunities.map((item) => [item.candidateId, item]),
  );
  const selectedOpportunity = query.opportunity
    ? await getProjectOpportunity(session.tenantId, query.opportunity)
    : null;
  const selectedCandidate = query.candidate
    ? await getOpportunityCandidate(session.tenantId, query.candidate)
    : !selectedOpportunity
      ? latestCandidates[0] ?? null
      : null;
  const promotedForSelected = selectedCandidate
    ? opportunityByCandidateId.get(selectedCandidate.id) ?? null
    : null;
  const detailOpportunity = selectedOpportunity ?? promotedForSelected;
  if (
    (detailOpportunity && detailOpportunity.projectId !== id) ||
    (selectedCandidate && selectedCandidate.projectId !== id)
  ) {
    notFound();
  }

  const sourceCandidate = detailOpportunity
    ? await getOpportunityCandidate(
        session.tenantId,
        detailOpportunity.candidateId,
      )
    : selectedCandidate;

  return (
    <IntelligencePane>
      {latestCandidates.length > 0 ? (
        <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[30%_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto">
            <section className="rounded-lg border border-border bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold">Opportunities</h2>
              <div className="space-y-1">
                {latestCandidates.map((item) => {
                  const opportunity = opportunityByCandidateId.get(item.id);
                  const selected = opportunity
                    ? detailOpportunity?.id === opportunity.id
                    : selectedCandidate?.id === item.id && !detailOpportunity;

                  return (
                    <Link
                      key={item.id}
                      href={
                        opportunity
                          ? intelligenceHref(id, "opportunities", {
                              opportunity: opportunity.id,
                            })
                          : intelligenceHref(id, "opportunities", {
                              candidate: item.id,
                            })
                      }
                      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm ${
                        selected
                          ? "bg-surface-selected font-semibold"
                          : "hover:bg-surface-2/60"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{titleCase(item.name)}</span>
                        {opportunity ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-[#3ECF8E]">
                            <CircleCheck
                              className="size-[18px]"
                              aria-hidden="true"
                            />
                            Promoted
                          </span>
                        ) : item.status === "rejected" ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-[#F16A50]">
                            <CircleX
                              className="size-[18px]"
                              aria-hidden="true"
                            />
                            Rejected
                          </span>
                        ) : null}
                      </span>
                      <ConfidenceIcon confidence={item.confidence} />
                    </Link>
                  );
                })}
              </div>
              {opportunities.length > 0 ? (
                <div className="mt-4 border-t border-border pt-4">
                  <Link
                    href={intelligenceHref(id, "business-case")}
                    className="flex h-8 w-full items-center justify-center rounded-md bg-accent px-2.5 text-sm font-normal text-accent-fg transition-colors hover:bg-accent-hover"
                  >
                    {businessCase ? "View Business Case" : "Build Business Case"}
                  </Link>
                </div>
              ) : null}
            </section>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {detailOpportunity ? (
              <div className="space-y-3">
                <OpportunityDetail
                  opportunity={detailOpportunity}
                  candidate={sourceCandidate}
                  projectId={id}
                  runDate={latest?.assessment.createdAt ?? null}
                />
                <p className="text-xs text-muted">
                  Promoted {formatDateTime(detailOpportunity.createdAt)}.
                </p>
              </div>
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
        </div>
      ) : (
        <p className="flex h-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Run intelligence to generate opportunity candidates.
        </p>
      )}
    </IntelligencePane>
  );
}
