"use client";

import { useState } from "react";
import Link from "next/link";
import { approveBusinessCaseAction } from "@/app/actions/business-case";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { intelligenceHref } from "@/lib/intelligence/routes";

export function DeploymentPanel({
  projectId,
  approved,
  ready,
}: {
  projectId: string;
  approved: boolean;
  ready: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(approved);

  async function approve() {
    setPending(true);
    setError(null);
    const result = await approveBusinessCaseAction(projectId);
    setPending(false);
    if (!result || "error" in result) {
      setError(
        result?.error === "incomplete"
          ? "Complete the required assumptions on the business case before approving."
          : "The business case could not be approved.",
      );
      return;
    }
    setLocked(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Deployment</h2>
            <p className="mt-1 text-sm text-muted">
              {locked
                ? "The business case is approved. Roadmap and rollout tracking will land here."
                : ready
                  ? "Approve the business case here when you are ready to proceed."
                  : "Finish the business case before you approve deployment."}
            </p>
            {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          </div>
          {locked ? (
            <p className="text-sm font-medium">Approved</p>
          ) : ready ? (
            <Button type="button" disabled={pending} onClick={approve}>
              {pending ? "Approving…" : "Approve"}
            </Button>
          ) : (
            <Link
              href={intelligenceHref(projectId, "business-case")}
              className={buttonClassName("secondary")}
            >
              Business Case
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
