"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { CandidateSignalRef } from "@/lib/db/types";
import { summarizeEvidenceLayers } from "@/modules/intelligence/evidence-expand";
import {
  summarizeBusinessContext,
  summarizeImplication,
  summarizeSupportingSignals,
} from "@/modules/intelligence/opportunity-summaries";

export function OpportunityFlow({
  area,
  process,
  capability,
  signals,
  signalHref,
  evidence,
  reasoning,
  consumptionDrivers,
  valueDrivers,
  constraints,
  dependencies,
}: {
  area: string;
  process: string;
  capability: string;
  signals?: CandidateSignalRef[];
  signalHref?: string;
  evidence: Array<string | { citation: string; label?: string; expansion?: string }>;
  reasoning?: string;
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies?: string[];
}) {
  const evidenceGroups = groupEvidence(evidence);
  const implicationBranches = [
    { title: "Consumption drivers", items: consumptionDrivers },
    { title: "Value drivers", items: valueDrivers },
    { title: "Constraints", items: constraints },
    ...(dependencies
      ? [{ title: "Dependencies", items: dependencies }]
      : []),
  ];

  return (
    <ol className="space-y-6">
      <FlowStep title="Business context">
        <Tree>
          <TreeItem last>
            <p className={nestedCopy}>
              {summarizeBusinessContext({ area, process, capability })}
            </p>
          </TreeItem>
        </Tree>
      </FlowStep>
      {signals ? (
        <FlowStep title="Supporting signals">
          <Tree>
            <TreeItem last>
              {signalHref && signals.length > 0 ? (
                <Link href={signalHref} className={`${nestedCopy} block hover:underline`}>
                  {summarizeSupportingSignals(signals)}
                </Link>
              ) : (
                <p className={nestedCopy}>
                  {summarizeSupportingSignals(signals)}
                </p>
              )}
            </TreeItem>
          </Tree>
        </FlowStep>
      ) : null}
      <FlowStep title="Evidence">
        {evidenceGroups.length > 0 ? (
          <Tree>
            {evidenceGroups.map((group, index) => (
              <TreeItem
                key={group.label || group.items[0]}
                last={index === evidenceGroups.length - 1}
              >
                {group.label ? (
                  <TreeBranch title={group.label}>
                    {group.items.map((item, itemIndex) => (
                      <TreeItem
                        key={item}
                        last={itemIndex === group.items.length - 1}
                      >
                        <p className={nestedCopy}>{item}</p>
                      </TreeItem>
                    ))}
                  </TreeBranch>
                ) : (
                  <p className={nestedCopy}>{group.items[0]}</p>
                )}
              </TreeItem>
            ))}
          </Tree>
        ) : (
          <Tree>
            <TreeItem last>
              <p className="text-sm text-muted">—</p>
            </TreeItem>
          </Tree>
        )}
      </FlowStep>
      {reasoning ? (
        <FlowStep title="Reasoning">
          <Tree>
            <TreeItem last>
              <p className={nestedCopy}>{reasoning}</p>
            </TreeItem>
          </Tree>
        </FlowStep>
      ) : null}
      <FlowStep last title="Implications">
        <Tree>
          {implicationBranches.map((branch, index) => (
            <TreeItem
              key={branch.title}
              last={index === implicationBranches.length - 1}
            >
              <TreeBranch title={branch.title}>
                <TreeItem last>
                  <p className={nestedCopy}>
                    {summarizeImplication(branch.title, branch.items)}
                  </p>
                </TreeItem>
              </TreeBranch>
            </TreeItem>
          ))}
        </Tree>
      </FlowStep>
    </ol>
  );
}

export function FlowStep({
  title,
  children,
  last = false,
  openByDefault = true,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
  openByDefault?: boolean;
}) {
  return (
    <li className="relative">
      {last ? null : (
        <span
          aria-hidden="true"
          className="absolute bottom-[-2rem] left-2 top-2 w-px bg-foreground/15"
        />
      )}
      <ToggleDetails openByDefault={openByDefault} className="group/step">
        <summary className={`${dotSummary} gap-3`}>
          <DotToggle tone="solid" />
          <h3 className="text-sm font-bold">{title}</h3>
        </summary>
        <div className="ml-2">{children}</div>
      </ToggleDetails>
    </li>
  );
}

function ToggleDetails({
  openByDefault = false,
  className,
  children,
}: {
  openByDefault?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const node = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    if (openByDefault && node.current) {
      node.current.open = true;
    }
  }, [openByDefault]);

  return (
    <details ref={node} className={className}>
      {children}
    </details>
  );
}

const nestedCopy =
  "max-w-prose pl-6 text-sm leading-relaxed text-muted";

const dotSummary =
  "relative z-10 flex cursor-pointer items-center list-none [&::-webkit-details-marker]:hidden [&::marker]:hidden";

function DotToggle({ tone }: { tone: "solid" | "outline" }) {
  return (
    <span
      aria-hidden="true"
      className={
        tone === "solid"
          ? "flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[11px] font-semibold leading-none text-accent-fg"
          : "flex h-4 w-4 items-center justify-center rounded-full border border-accent bg-transparent text-[11px] font-semibold leading-none text-accent"
      }
    >
      {tone === "solid" ? (
        <>
          <span className="group-open/step:hidden">+</span>
          <span className="hidden group-open/step:inline">-</span>
        </>
      ) : (
        <>
          <span className="group-open/branch:hidden">+</span>
          <span className="hidden group-open/branch:inline">-</span>
        </>
      )}
    </span>
  );
}

export function Tree({ children }: { children: ReactNode }) {
  return <ul>{children}</ul>;
}

export function TreeBranch({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <ToggleDetails className="group/branch">
      <summary className={`${dotSummary} gap-2`}>
        <DotToggle tone="outline" />
        <p className="text-sm font-bold">{title}</p>
      </summary>
      <Tree>{children}</Tree>
    </ToggleDetails>
  );
}

export function TreeItem({
  children,
  last = false,
}: {
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative pl-5">
      <span
        aria-hidden="true"
        className={`absolute left-0 w-px bg-foreground/15 ${last ? "top-0 h-3" : "inset-y-0"}`}
      />
      <span
        aria-hidden="true"
        className="absolute left-0 top-3 h-px w-5 bg-foreground/15"
      />
      <div className="py-1">{children}</div>
    </li>
  );
}

function groupEvidence(
  evidence: Array<string | { citation: string; label?: string; expansion?: string }>,
) {
  const citations = evidence.map((entry) =>
    typeof entry === "string" ? entry : entry.citation,
  );

  return summarizeEvidenceLayers({ citations }).map((layer) => ({
    label: layer.label,
    items: [layer.paragraph],
  }));
}
