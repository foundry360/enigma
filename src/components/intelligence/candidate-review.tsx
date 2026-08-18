import type { ReactNode } from "react";
import Link from "next/link";
import { updateCandidateAction } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";
import type { OpportunityCandidateRow } from "@/lib/db/types";
import { formatDateTime, titleCase } from "@/lib/format";

const confidenceLabel = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

const statusLabel = {
  candidate: "Candidate",
  validated: "Validated",
  rejected: "Rejected",
  promoted: "Promoted",
} as const;

export function CandidateReview({
  candidate,
  projectId,
  runDate,
}: {
  candidate: OpportunityCandidateRow;
  projectId: string;
  runDate: Date | string;
}) {
  const open =
    candidate.status === "candidate" || candidate.status === "validated";

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase">{candidate.name}</h2>
          <p className="mt-1 text-sm text-muted">{candidate.description}</p>
        </div>
        <span className="text-xs text-muted">
          {statusLabel[candidate.status]} · {confidenceLabel[candidate.confidence]}{" "}
          confidence
        </span>
      </div>
      <dl className="min-w-0 divide-y divide-border">
        <MetaRow label="Why Enigma identified this">{candidate.finding}</MetaRow>
        <MetaRow label="Business context">
          {candidate.businessArea} · {candidate.businessProcess} ·{" "}
          {candidate.recommendedCapability}
        </MetaRow>
        <MetaRow label="Supporting signals">
          <ul className="space-y-2">
            {candidate.supportingSignals.map((signal) => (
              <li key={signal.key}>
                <Link
                  href={`/projects/${projectId}/intelligence?assessment=${candidate.assessmentId}`}
                  className="hover:underline"
                >
                  {signal.strength === "weak" ? "⚠" : "✓"} {signal.title}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {titleCase(signal.strength)}
                </span>
              </li>
            ))}
          </ul>
        </MetaRow>
        <MetaRow label="Evidence">
          {candidate.evidence.length > 0 ? (
            <ul className="space-y-1">
              {candidate.evidence.map((entry, index) => (
                <li key={`${entry.citation}-${index}`}>{entry.citation}</li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </MetaRow>
        <MetaRow label="Potential consumption drivers">
          {candidate.consumptionDrivers.join(", ")}
        </MetaRow>
        <MetaRow label="Potential value drivers">
          {candidate.valueDrivers.join(", ")}
        </MetaRow>
        <MetaRow label="Constraints">
          {candidate.constraints.join(", ")}
        </MetaRow>
        <MetaRow label="Dependencies">
          {candidate.dependencies.join(", ")}
        </MetaRow>
        <MetaRow label="Intelligence run">{formatDateTime(runDate)}</MetaRow>
      </dl>
      {open ? (
        <div className="mt-4 flex flex-wrap items-end justify-end gap-2">
          <form action={updateCandidateAction} className="flex items-end gap-2">
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="rejected" />
            <label className="block">
              <span className="sr-only">Rejection reason</span>
              <input
                name="rejectionReason"
                placeholder="Reason (optional)"
                className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-placeholder focus:border-foreground"
              />
            </label>
            <Button type="submit" variant="ghost">
              Reject
            </Button>
          </form>
          {candidate.status === "candidate" ? (
            <form action={updateCandidateAction}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="status" value="validated" />
              <Button type="submit" variant="secondary">
                Validate
              </Button>
            </form>
          ) : null}
          <form action={updateCandidateAction}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="status" value="promoted" />
            <Button type="submit">Promote to Opportunity</Button>
          </form>
        </div>
      ) : null}
    </section>
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
    <div className="grid grid-cols-[10.5rem_minmax(0,1fr)] items-start gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
