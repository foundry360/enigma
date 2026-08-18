"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StrengthBadge } from "@/components/ui/score-ring";
import type { SignalStrength } from "@/modules/intelligence/types";

export type OpportunityCandidateItem = {
  id: string;
  title: string;
  strength: SignalStrength;
  process: string;
  supportedBy: string[];
  consumptionDrivers: string[];
  valueDrivers: string[];
};

export function OpportunityCandidates({
  items,
  reviewHref,
}: {
  items: OpportunityCandidateItem[];
  reviewHref: string;
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
                    <StrengthBadge state={item.strength} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.process}</p>
                </div>
                <Link href={reviewHref} className={buttonClassName("secondary")}>
                  Review
                </Link>
              </div>
              <dl className="mt-3 grid gap-8 text-sm md:grid-cols-3">
                <Meta label="Supported by">{item.supportedBy.join(", ")}</Meta>
                <Meta label="Consumption drivers">
                  {item.consumptionDrivers.join(", ")}
                </Meta>
                <Meta label="Value drivers">{item.valueDrivers.join(", ")}</Meta>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}
