import { updateCandidateAction } from "@/app/actions/opportunities";
import { OpportunityFlow } from "@/components/intelligence/opportunity-flow";
import { Button } from "@/components/ui/button";
import type { OpportunityCandidateRow } from "@/lib/db/types";

export function CandidateReview({
  candidate,
  projectId,
}: {
  candidate: OpportunityCandidateRow;
  projectId: string;
}) {
  const open =
    candidate.status === "candidate" || candidate.status === "validated";

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{candidate.name}</h2>
        <p className="mt-1 text-sm text-muted">{candidate.description}</p>
      </div>
      <div className="mb-4 border-t border-border" />

      <OpportunityFlow
        area={candidate.businessArea}
        process={candidate.businessProcess}
        capability={candidate.recommendedCapability}
        signals={candidate.supportingSignals}
        signalHref={`/projects/${projectId}/intelligence?assessment=${candidate.assessmentId}`}
        evidence={candidate.evidence.map((entry) => entry.citation)}
        reasoning={candidate.finding}
        consumptionDrivers={candidate.consumptionDrivers}
        valueDrivers={candidate.valueDrivers}
        constraints={candidate.constraints}
        dependencies={candidate.dependencies}
      />

      {open ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <form action={updateCandidateAction}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="rejected" />
            <Button type="submit" variant="ghost">
              Reject
            </Button>
          </form>
          <form action={updateCandidateAction}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="promoted" />
            <Button type="submit">Promote</Button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
