"use client";

import { useFormStatus } from "react-dom";
import { startDiscoveryAction } from "@/app/actions/assessments";
import { Button } from "@/components/ui/button";

export function AssessmentRunForm({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  return (
    <form action={startDiscoveryAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton label={label} />
      <AssessmentRunOverlay />
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

function AssessmentRunOverlay() {
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
      aria-label="Intelligence starting"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface px-8 py-7">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold">Starting intelligence</p>
        </div>
      </div>
    </div>
  );
}
