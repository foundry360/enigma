import { updateCandidateAction } from "@/app/actions/opportunities";
import { OpportunityFlow } from "@/components/intelligence/opportunity-flow";
import { Button } from "@/components/ui/button";
import type {
  OpportunityCandidateRow,
  ProjectOpportunityRow,
} from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";

export function OpportunityDetail({
  opportunity,
  candidate,
  projectId,
}: {
  opportunity: ProjectOpportunityRow;
  candidate: OpportunityCandidateRow | null;
  projectId: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{opportunity.name}</h2>
        <p className="mt-1 text-sm text-muted">{opportunity.description}</p>
      </div>
      <div className="mb-4 border-t border-border" />

      <OpportunityFlow
        area={opportunity.businessArea}
        process={opportunity.businessProcess}
        capability={opportunity.recommendedCapability}
        signals={candidate?.supportingSignals}
        signalHref={`/projects/${projectId}/intelligence?assessment=${opportunity.assessmentId}`}
        evidence={
          candidate && candidate.evidence.length > 0
            ? candidate.evidence.map((entry) => ({
                citation: entry.citation,
                expansion: entry.expansion,
              }))
            : ["Referenced from the source candidate."]
        }
        reasoning={candidate?.finding}
        consumptionDrivers={candidate?.consumptionDrivers ?? []}
        valueDrivers={candidate?.valueDrivers ?? []}
        constraints={candidate?.constraints ?? []}
        dependencies={candidate?.dependencies}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-xs text-muted">
          Promoted {formatDateTime(opportunity.createdAt)}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form action={updateCandidateAction}>
            <input type="hidden" name="candidateId" value={opportunity.candidateId} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="rejected" />
            <Button type="submit" variant="ghost">
              Reject
            </Button>
          </form>
          <form action={updateCandidateAction}>
            <input type="hidden" name="candidateId" value={opportunity.candidateId} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="candidate" />
            <Button type="submit" variant="secondary">
              Unpromote
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
