import Link from "next/link";
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
  runDate,
}: {
  opportunity: ProjectOpportunityRow;
  candidate: OpportunityCandidateRow | null;
  projectId: string;
  runDate: Date | string | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{opportunity.name}</h2>
          <p className="mt-1 text-sm text-muted">{opportunity.description}</p>
        </div>
        <span className="text-xs text-muted">Opportunity</span>
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
            ? candidate.evidence.map((entry) => entry.citation)
            : ["Referenced from the source candidate."]
        }
        reasoning={candidate?.finding}
        consumptionDrivers={candidate?.consumptionDrivers ?? []}
        valueDrivers={candidate?.valueDrivers ?? []}
        constraints={candidate?.constraints ?? []}
        dependencies={candidate?.dependencies}
      />

      <p className="mt-5 text-xs text-muted">
        Intelligence run ·{" "}
        {runDate ? (
          <Link
            href={`/projects/${projectId}/intelligence?assessment=${opportunity.assessmentId}`}
            className="hover:underline"
          >
            {formatDateTime(runDate)}
          </Link>
        ) : (
          "—"
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
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
    </section>
  );
}
