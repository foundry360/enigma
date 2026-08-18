"use client";

import { useState, type ReactNode } from "react";
import { RiskBadge, ScoreRing, riskColors } from "@/components/ui/score-ring";
import { titleCase } from "@/lib/format";
import { readinessRisk, signalState } from "@/modules/intelligence/score";

export type CategoryItem = {
  id: string;
  title: string;
  score: number;
  evidence: { citation: string }[];
  reason: string;
  risk: string;
  recommendation: string;
  consumption?: string;
};

const stateLabel = {
  strong: "Strong",
  mixed: "Mixed",
  weak: "Weak",
} as const;

export function ReadinessCategories({
  items,
  title = "Categories",
  tone = "readiness",
}: {
  items: CategoryItem[];
  title?: string;
  tone?: "readiness" | "signal";
}) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[30%_minmax(0,1fr)]">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase">{title}</h2>
        <div className="space-y-1">
          {items.map((item) => {
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
                  active
                    ? "bg-surface-2"
                    : "hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {titleCase(item.title)}
                  </p>
                  <p className="text-xs text-muted">
                    {tone === "signal"
                      ? `${stateLabel[signalState(item.score)]} · ${item.evidence.length}`
                      : item.score}
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
          <h2 className="text-sm font-semibold uppercase">
            {titleCase(selected.title)}
          </h2>
          {tone === "signal" ? (
            <span className="text-xs text-muted">
              {stateLabel[signalState(selected.score)]}
            </span>
          ) : (
            <RiskBadge risk={readinessRisk(selected.score)} />
          )}
        </div>
        <div
          className={
            tone === "signal"
              ? ""
              : "grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-6"
          }
        >
          {tone === "readiness" ? (
            <div className="flex justify-center md:justify-start">
              <ScoreRing score={selected.score} showBadge={false} />
            </div>
          ) : null}
          <dl className="min-w-0 divide-y divide-border">
            <MetaRow label="Meaning">{selected.reason}</MetaRow>
            {tone === "signal" ? (
              <MetaRow label="Consumption">
                {selected.consumption || "—"}
              </MetaRow>
            ) : selected.consumption ? (
              <MetaRow label="Consumption">{selected.consumption}</MetaRow>
            ) : null}
            <MetaRow label="Risk">{selected.risk}</MetaRow>
            <MetaRow label="Recommendation">{selected.recommendation}</MetaRow>
            {selected.evidence.length > 0 ? (
              <MetaRow label="Evidence">
                <ul className="space-y-1">
                  {selected.evidence.map((entry, index) => (
                    <li key={`${entry.citation}-${index}`}>{entry.citation}</li>
                  ))}
                </ul>
              </MetaRow>
            ) : null}
          </dl>
        </div>
      </section>
    </div>
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
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
