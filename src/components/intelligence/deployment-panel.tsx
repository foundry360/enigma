"use client";

import { useState } from "react";
import Link from "next/link";
import { approveBusinessCaseAction } from "@/app/actions/business-case";
import {
  FlowStep,
  Tree,
  TreeBranch,
  TreeItem,
} from "@/components/intelligence/opportunity-flow";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatCompactCurrency,
  formatCompactNumber,
} from "@/lib/format";
import { intelligenceHref } from "@/lib/intelligence/routes";

export type DeploymentBranch = {
  heading: string;
  items: string[];
};

export type DeploymentStream = {
  name: string;
  description: string;
  branches: DeploymentBranch[];
};

export function DeploymentPanel({
  projectId,
  approved,
  canApprove,
  platforms,
  baselineDays,
  enigmaDays,
  recommendation,
  gaps,
  impacted,
  consumption,
  value,
  investment,
  streams,
}: {
  projectId: string;
  approved: boolean;
  canApprove: boolean;
  platforms: string[];
  baselineDays: number | null;
  enigmaDays: number | null;
  recommendation: string;
  gaps: string[];
  impacted: number | null;
  consumption: number | null;
  value: number | null;
  investment: number | null;
  streams: DeploymentStream[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(approved);
  const daysSaved =
    baselineDays != null && enigmaDays != null && baselineDays > enigmaDays
      ? baselineDays - enigmaDays
      : null;
  const scope =
    platforms.length > 0 ? platforms.join(", ") : "the platforms in scope";

  async function approve() {
    setPending(true);
    setError(null);
    const result = await approveBusinessCaseAction(projectId);
    setPending(false);
    if (!result || "error" in result) {
      setError(
        result?.error === "incomplete"
          ? "The case still has gaps. You can keep working the path, or finish the business case before you lock it."
          : "The business case could not be approved.",
      );
      return;
    }
    setLocked(true);
  }

  return (
    <div className="space-y-4 pb-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">
              Path To Go Live
            </h2>
            <p className="mt-1 text-sm text-muted">
              {locked
                ? `This case is locked. Use the path below to stand the work up on ${scope}.`
                : `Three steps from the saved case, for ${scope}. Approve when you are ready to proceed.`}
            </p>
            {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={intelligenceHref(projectId, "business-case")}
              className={buttonClassName("secondary")}
            >
              Business Case
            </Link>
            {locked ? (
              <p className="text-sm font-medium">Approved</p>
            ) : (
              <Button
                type="button"
                disabled={pending || !canApprove}
                onClick={approve}
              >
                {pending ? "Approving…" : "Approve"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-semibold">
          1. Confirm The Case
        </p>
        <p className="mt-1 text-sm text-muted">{recommendation}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Work The Agent Would Take"
            value={formatCompactNumber(impacted)}
          />
          <Metric
            label="Consumption"
            value={formatCompactCurrency(consumption)}
          />
          <Metric label="Value" value={formatCompactCurrency(value)} />
          <Metric
            label="Investment"
            value={formatCompactCurrency(investment)}
          />
        </div>
        {gaps.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Still Needed</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card>
        <p className="text-lg font-semibold">
          2. Stand Up The Work
        </p>
        <p className="mt-1 text-sm text-muted">
          What must be true before go-live. This is the work, not a platform
          install.
        </p>
        {streams.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Promote an opportunity and save the business case to name the work.
          </p>
        ) : (
          <ol className="mt-4 space-y-6">
            {streams.map((stream, index) => (
              <FlowStep
                key={`${stream.name}-${index}`}
                title={stream.name}
                last={index === streams.length - 1}
                openByDefault={false}
              >
                {stream.description ? (
                  <p className="mb-2 text-sm text-muted">{stream.description}</p>
                ) : null}
                <Tree>
                  {stream.branches.map((branch, branchIndex) => (
                    <TreeItem
                      key={branch.heading}
                      last={branchIndex === stream.branches.length - 1}
                    >
                      <TreeBranch title={branch.heading}>
                        {branch.items.map((item, itemIndex) => (
                          <TreeItem
                            key={item}
                            last={itemIndex === branch.items.length - 1}
                          >
                            <p className="text-sm">{item}</p>
                          </TreeItem>
                        ))}
                      </TreeBranch>
                    </TreeItem>
                  ))}
                </Tree>
              </FlowStep>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <p className="text-lg font-semibold">
          3. Go Live
        </p>
        <p className="mt-1 text-sm text-muted">
          Time to live from the saved business case.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Without Us"
            value={baselineDays != null ? `${baselineDays} days` : "—"}
          />
          <Metric
            label="With Us"
            value={enigmaDays != null ? `${enigmaDays} days` : "—"}
          />
          <Metric
            label="Days Saved"
            value={daysSaved != null ? `${daysSaved} days` : "—"}
          />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

