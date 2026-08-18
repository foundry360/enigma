"use client";

import { useFormStatus } from "react-dom";
import { startDiscoveryAction } from "@/app/actions/assessments";
import { Button } from "@/components/ui/button";

export function AssessmentRunForm({
  projectId,
  label,
  orgName,
  orgId,
}: {
  projectId: string;
  label: string;
  orgName?: string | null;
  orgId?: string | null;
}) {
  return (
    <form action={startDiscoveryAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton label={label} />
      <AssessmentRunOverlay orgName={orgName} orgId={orgId} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Starting…" : label}
    </Button>
  );
}

function AssessmentRunOverlay({
  orgName,
  orgId,
}: {
  orgName?: string | null;
  orgId?: string | null;
}) {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-label="Assessment starting"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface px-8 py-7">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold">Starting Assessment</p>
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="min-w-0 text-right font-medium">
              {orgName || "Connected org"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Org Instance ID</dt>
            <dd className="min-w-0 break-all text-right font-medium">
              {orgId || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
