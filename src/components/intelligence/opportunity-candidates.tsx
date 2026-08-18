"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import type { CandidateConfidence, CandidateSignalRef } from "@/lib/db/types";

export type OpportunityCandidateItem = {
  id: string;
  title: string;
  description: string;
  confidence: CandidateConfidence;
  status: string;
  supportingSignals: CandidateSignalRef[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  reviewHref: string;
};

const confidenceLabel: Record<CandidateConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function OpportunityCandidates({
  items,
}: {
  items: OpportunityCandidateItem[];
}) {
  const [open, setOpen] = useState(true);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            ▸
          </span>
          <span className="text-sm font-semibold uppercase">
            Opportunity candidates
          </span>
        </span>
        <span className="text-xs text-muted">{items.length}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-border px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <span className="text-xs text-muted">
                      {confidenceLabel[item.confidence]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
                <Link
                  href={item.reviewHref}
                  className={buttonClassName("secondary")}
                >
                  Review Candidate
                </Link>
              </div>
              <div className="mt-3 grid gap-6 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted">Supported by</p>
                  <ul className="mt-1 space-y-1">
                    {item.supportingSignals.map((signal) => (
                      <li key={signal.key}>
                        {signal.strength === "weak" ? "⚠" : "✓"} {signal.title}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted">
                    Potential consumption drivers
                  </p>
                  <p className="mt-1">{item.consumptionDrivers.join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Potential value drivers</p>
                  <p className="mt-1">{item.valueDrivers.join(", ")}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
