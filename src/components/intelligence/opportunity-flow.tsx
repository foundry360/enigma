import type { ReactNode } from "react";
import Link from "next/link";
import { strengthColors } from "@/components/ui/score-ring";
import type { CandidateSignalRef } from "@/lib/db/types";
import { titleCase } from "@/lib/format";

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
  evidence: string[];
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
    <ol className="relative space-y-6">
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-2 top-2 w-px bg-foreground/15"
      />
      <FlowStep title="Business context">
        <Tree>
          <TreeItem last>
            <p className="text-sm">
              {area}
              <span className="mx-2 text-muted">→</span>
              {process}
              <span className="mx-2 text-muted">→</span>
              {capability}
            </p>
          </TreeItem>
        </Tree>
      </FlowStep>
      {signals ? (
        <FlowStep title="Supporting signals">
          {signals.length > 0 ? (
            <Tree>
              {signals.map((signal, index) => {
                const row = (
                  <>
                    <span
                      style={{ color: strengthColors[signal.strength] }}
                      aria-hidden="true"
                    >
                      {signal.strength === "weak" ? "⚠" : "✓"}
                    </span>
                    <span>{signal.title}</span>
                    <span
                      className="text-xs"
                      style={{ color: strengthColors[signal.strength] }}
                    >
                      {titleCase(signal.strength)}
                    </span>
                  </>
                );

                return (
                  <TreeItem
                    key={signal.key}
                    last={index === signals.length - 1}
                  >
                    {signalHref ? (
                      <Link
                        href={signalHref}
                        className="inline-flex items-center gap-2 text-sm hover:underline"
                      >
                        {row}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm">
                        {row}
                      </span>
                    )}
                  </TreeItem>
                );
              })}
            </Tree>
          ) : (
            <Tree>
              <TreeItem last>
                <p className="text-sm text-muted">—</p>
              </TreeItem>
            </Tree>
          )}
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
                  <>
                    <p className="text-sm font-bold">{group.label}</p>
                    <Tree>
                      {group.items.map((item, itemIndex) => (
                        <TreeItem
                          key={item}
                          last={itemIndex === group.items.length - 1}
                        >
                          <p className="text-sm">{item}</p>
                        </TreeItem>
                      ))}
                    </Tree>
                  </>
                ) : (
                  <p className="text-sm">{group.items[0]}</p>
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
              <p className="text-sm leading-relaxed">{reasoning}</p>
            </TreeItem>
          </Tree>
        </FlowStep>
      ) : null}
      <FlowStep title="Implications">
        <Tree>
          {implicationBranches.map((branch, index) => (
            <TreeItem
              key={branch.title}
              last={index === implicationBranches.length - 1}
            >
              <p className="text-sm font-bold">{branch.title}</p>
              <Tree>
                {(branch.items.length > 0 ? branch.items : ["—"]).map(
                  (item, itemIndex, items) => (
                    <TreeItem
                      key={item}
                      last={itemIndex === items.length - 1}
                    >
                      <p
                        className={`text-sm ${item === "—" ? "text-muted" : ""}`}
                      >
                        {item}
                      </p>
                    </TreeItem>
                  ),
                )}
              </Tree>
            </TreeItem>
          ))}
        </Tree>
      </FlowStep>
    </ol>
  );
}

function FlowStep({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="relative">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="relative z-10 size-4 shrink-0 rounded-full border-2 bg-surface"
          style={{ borderColor: strengthColors.strong }}
        />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="ml-2">{children}</div>
    </li>
  );
}

function Tree({ children }: { children: ReactNode }) {
  return <ul>{children}</ul>;
}

function TreeItem({
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

function groupEvidence(citations: string[]) {
  const groups: { label: string; items: string[] }[] = [];

  for (const citation of citations) {
    const split = citation.indexOf(": ");
    if (split === -1) {
      groups.push({ label: "", items: [citation] });
      continue;
    }

    const label = citation.slice(0, split);
    const item = citation.slice(split + 2);
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}
