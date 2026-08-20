"use client";

import { useState, type ReactNode } from "react";
import { setCandidateStatusAction } from "@/app/actions/assessments";
import { EvidenceCitations } from "@/components/intelligence/evidence-citation";
import { Button } from "@/components/ui/button";
import { riskColors } from "@/components/ui/score-ring";
import { titleCase } from "@/lib/format";
import type { ForecastConfidence } from "@/modules/intelligence/consumption";
import { readinessRisk } from "@/modules/intelligence/score";

export type OpportunityBoardItem = {
  id: string;
  key: string;
  title: string;
  score: number;
  delta: number | null;
  driver: string;
  unitHint: string;
  confidence: ForecastConfidence;
  process: string;
  supportingSignals: string[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  status: "candidate" | "promoted" | "rejected";
  evidence: { citation: string }[];
  reason: string;
  risk: string;
  recommendation: string;
};

const confidenceLabel: Record<ForecastConfidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function OpportunityBoard({
  items,
  assessmentId,
}: {
  items: OpportunityBoardItem[];
  assessmentId?: string;
}) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[30%_minmax(0,1fr)]">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Candidates</h2>
        <div className="space-y-1">
          {items.map((item, index) => {
            const active = item.id === selected.id;
            const risk = readinessRisk(item.score);
            const fill = risk ? riskColors[risk] : "var(--border)";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-pressed={active}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-surface-selected" : "hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    <span className="mr-2 text-xs tabular-nums text-muted">
                      {index + 1}
                    </span>
                    {titleCase(item.title)}
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {item.score}
                    {formatDelta(item.delta)}
                  </p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-border"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(Math.max(item.score, 0), 100)}%`,
                      backgroundColor: fill,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{titleCase(selected.title)}</h2>
          <span className="text-xs text-muted">
            {selected.status === "promoted"
              ? "Promoted"
              : selected.status === "rejected"
                ? "Rejected"
                : "Candidate"}
          </span>
        </div>
        <dl className="min-w-0 divide-y divide-border">
          <MetaRow label="Hypothesis">{selected.reason}</MetaRow>
          <MetaRow label="Process">{selected.process}</MetaRow>
          <MetaRow label="Supported by">
            {selected.supportingSignals
              .map((key) => titleCase(key.replaceAll("_", " ")))
              .join(", ")}
          </MetaRow>
          <MetaRow label="Consumption drivers">
            {selected.consumptionDrivers.join(", ")}
            <p className="mt-1 text-muted">{selected.unitHint}</p>
          </MetaRow>
          <MetaRow label="Value drivers">
            {selected.valueDrivers.join(", ")}
          </MetaRow>
          <MetaRow label="Confidence">
            {confidenceLabel[selected.confidence]}
            {selected.delta != null ? (
              <span className="text-muted">{` · ${formatDelta(selected.delta).trim() || "unchanged"} since last run`}</span>
            ) : null}
          </MetaRow>
          <MetaRow label="What must be true">
            {selected.recommendation}
          </MetaRow>
          <MetaRow label="Risk">{selected.risk}</MetaRow>
          {selected.evidence.length > 0 ? (
            <MetaRow label="Evidence">
              <EvidenceCitations
                citations={selected.evidence.map((entry) => entry.citation)}
              />
            </MetaRow>
          ) : null}
        </dl>
        {assessmentId ? (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <form action={setCandidateStatusAction}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="key" value={selected.key} />
              <input type="hidden" name="status" value="rejected" />
              <Button type="submit" variant="ghost">
                Reject
              </Button>
            </form>
            <form action={setCandidateStatusAction}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="key" value={selected.key} />
              <input type="hidden" name="status" value="promoted" />
              <Button type="submit">Promote</Button>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatDelta(delta: number | null) {
  if (delta == null || delta === 0) {
    return "";
  }

  return delta > 0 ? ` +${delta}` : ` ${delta}`;
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
