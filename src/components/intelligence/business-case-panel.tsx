"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  Clock,
  Coins,
  Gauge,
  Layers,
  Percent,
  TrendingUp,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  ensureBusinessCaseStoriesAction,
  saveBusinessCaseAction,
} from "@/app/actions/business-case";
import { IntelligenceHeaderPortal } from "@/components/intelligence/intelligence-header-actions";
import { OpportunityFlow } from "@/components/intelligence/opportunity-flow";
import { strengthColors } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrencyPrecise,
  formatMonths,
  formatMultiple,
  formatPercent,
} from "@/lib/format";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { splitCitedCopy } from "@/modules/economics/briefing";
import type { BusinessCaseDetail } from "@/modules/economics/case-view";
import {
  fallbackJustificationStory,
  fallbackRecommendationStory,
  fillStorySlots,
  shouldRefreshCaseStories,
  storyValues,
} from "@/modules/economics/story-slots";
import {
  adoptionForScenario,
  defaultAdoption,
  normalizeAdoption,
  recommendationLabel,
  scenarios,
  sumProjectInvestment,
  summarizeCase,
  type BusinessCaseDraft,
  type ProjectInvestment,
  type Scenario,
} from "@/modules/economics/model";

const scenarioLabel: Record<Scenario, string> = {
  conservative: "Conservative",
  expected: "Expected",
  aggressive: "Aggressive",
};

export function BusinessCasePanel({
  projectId,
  projectInvestment,
  detail: initial,
}: {
  projectId: string;
  projectInvestment: ProjectInvestment;
  detail: BusinessCaseDetail;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingJustification, setShowingJustification] = useState(false);
  const [showingRecommendation, setShowingRecommendation] = useState(false);
  const [showingEvidence, setShowingEvidence] = useState(false);
  const [showingGaps, setShowingGaps] = useState(false);
  const scenarioRates = useMemo(
    () =>
      normalizeAdoption({
        conservative: draft.conservativeAdoption,
        expected: draft.expectedAdoption,
        aggressive: draft.aggressiveAdoption,
      }),
    [
      draft.aggressiveAdoption,
      draft.conservativeAdoption,
      draft.expectedAdoption,
    ],
  );
  const [liveAdoption, setLiveAdoption] = useState(
    () =>
      adoptionForScenario(initial.businessCase.scenario, {
        conservative: initial.businessCase.conservativeAdoption,
        expected: initial.businessCase.expectedAdoption,
        aggressive: initial.businessCase.aggressiveAdoption,
      }) ?? defaultAdoption.expected,
  );

  useEffect(() => {
    setDetail(initial);
    setDraft(toDraft(initial));
    setLiveAdoption(
      adoptionForScenario(initial.businessCase.scenario, {
        conservative: initial.businessCase.conservativeAdoption,
        expected: initial.businessCase.expectedAdoption,
        aggressive: initial.businessCase.aggressiveAdoption,
      }) ?? defaultAdoption.expected,
    );
  }, [initial]);
  const locked = detail.businessCase.status === "approved";
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(toDraft(detail)) ||
    Math.abs(liveAdoption - scenarioRates[draft.scenario]) > 0.0005;

  const confidence = detail.lines.some((line) => line.confidence === "high")
    ? "high"
    : detail.lines.some((line) => line.confidence === "medium")
      ? "medium"
      : detail.lines[0]?.confidence ?? null;

  const live = useMemo(
    () =>
      summarizeCase({
        lines: draft.lines,
        scenario: draft.scenario,
        conservativeAdoption:
          draft.scenario === "conservative"
            ? liveAdoption
            : scenarioRates.conservative,
        expectedAdoption:
          draft.scenario === "expected" ? liveAdoption : scenarioRates.expected,
        aggressiveAdoption:
          draft.scenario === "aggressive"
            ? liveAdoption
            : scenarioRates.aggressive,
        baselineDays: draft.baselineDays,
        enigmaDays: draft.enigmaDays,
        implementationCost: sumProjectInvestment(projectInvestment),
        hasWeakSignals: detail.lines.some((line) =>
          line.supportingSignals.some((signal) => signal.strength === "weak"),
        ),
        confidence,
      }),
    [
      confidence,
      detail.lines,
      draft.baselineDays,
      draft.enigmaDays,
      draft.lines,
      draft.scenario,
      liveAdoption,
      projectInvestment,
      scenarioRates,
    ],
  );

  const volume = draft.lines.reduce(
    (sum, line) => sum + (line.annualVolume ?? 0),
    0,
  );
  const adoption = liveAdoption;

  function persistDraft(): BusinessCaseDraft {
    return {
      ...draft,
      conservativeAdoption:
        draft.scenario === "conservative"
          ? liveAdoption
          : scenarioRates.conservative,
      expectedAdoption:
        draft.scenario === "expected" ? liveAdoption : scenarioRates.expected,
      aggressiveAdoption:
        draft.scenario === "aggressive"
          ? liveAdoption
          : scenarioRates.aggressive,
    };
  }

  function slideAdoption(percent: number) {
    const next = percent / 100;
    setLiveAdoption(next);
    setDraft((current) => ({
      ...current,
      scenario: nearestScenario(next, scenarioRates, current.scenario),
    }));
  }

  const investmentTotal = sumProjectInvestment(projectInvestment);
  const daysAccelerated =
    draft.baselineDays != null &&
    draft.enigmaDays != null &&
    draft.baselineDays > draft.enigmaDays
      ? draft.baselineDays - draft.enigmaDays
      : null;
  const hoursOnItem = draft.lines[0]?.hoursSavedPerUnit ?? null;
  const laborCost = draft.lines[0]?.hourlyCost ?? null;
  const workItemCost = draft.lines[0]?.unitPrice ?? null;
  const workTaken = live.rollup.impacted;
  const opportunityIds = detail.lines.map((line) => line.opportunityId);
  const opportunityNames = detail.lines.map((line) => line.opportunityName);
  const liveStory = storyValues({
    volume: volume || null,
    share: adoption,
    impacted: workTaken,
    hours: hoursOnItem,
    labor: laborCost,
    value: live.rollup.value,
    workItemCost,
    consumption: live.rollup.consumption,
    net: live.rollup.netAnnual,
    roc: live.rollup.roc,
    state: live.recommendationState,
  });
  const refreshStories = shouldRefreshCaseStories({
    justification: detail.businessCase.justificationNarrative,
    recommendation: detail.businessCase.recommendationNarrative,
    intelligence: detail.businessCase.intelligenceNarrative,
    opportunityIds,
  });
  const justificationTemplate = refreshStories
    ? fallbackJustificationStory({
        complete: live.rollup.complete,
        process: detail.lines[0]?.businessProcess ?? null,
        area: detail.lines[0]?.businessArea ?? null,
        capability: detail.lines[0]?.recommendedCapability ?? null,
        opportunityNames,
        valueDrivers: detail.lines[0]?.valueDrivers ?? [],
        consumptionDrivers: detail.lines[0]?.consumptionDrivers ?? [],
        constraints: detail.lines[0]?.constraints ?? [],
      })
    : detail.businessCase.justificationNarrative!;
  const recommendationTemplate = refreshStories
    ? fallbackRecommendationStory(live.rollup.complete, opportunityNames)
    : detail.businessCase.recommendationNarrative!;
  const justificationNarrative = fillStorySlots(
    justificationTemplate,
    liveStory,
  );
  const recommendationNarrative = fillStorySlots(
    recommendationTemplate,
    liveStory,
  );

  useEffect(() => {
    if (locked || !refreshStories) {
      return;
    }

    let cancelled = false;
    void ensureBusinessCaseStoriesAction(projectId).then((result) => {
      if (cancelled || !result || "error" in result) {
        return;
      }
      setDetail(result.detail);
    });

    return () => {
      cancelled = true;
    };
  }, [
    detail.businessCase.intelligenceNarrative,
    detail.businessCase.justificationNarrative,
    detail.businessCase.recommendationNarrative,
    locked,
    projectId,
    refreshStories,
  ]);

  const shareThresholdLabel =
    liveAdoption + 0.0005 >= scenarioRates.aggressive
      ? scenarioLabel.aggressive
      : liveAdoption + 0.0005 >= scenarioRates.expected
        ? scenarioLabel.expected
        : liveAdoption + 0.0005 >= scenarioRates.conservative
          ? scenarioLabel.conservative
          : null;
  const risks = [
    ...live.gaps.map((gap) => ({
      text: gap,
      tone: "weak" as const,
    })),
    ...detail.lines.flatMap((line) =>
      line.supportingSignals
        .filter(
          (signal) =>
            signal.strength === "weak" ||
            (signal.key === "automation_collision" &&
              signal.strength !== "strong"),
        )
        .map((signal) => ({
          text:
            signal.key === "automation_collision"
              ? "Existing automation requires review before write-back."
              : `${signal.title} is ${signal.strength} and needs customer validation.`,
          tone:
            signal.strength === "weak" ? ("weak" as const) : ("mixed" as const),
        })),
    ),
  ].filter(
    (item, index, items): item is { text: string; tone: "weak" | "mixed" } =>
      Boolean(item) &&
      items.findIndex((entry) => entry?.text === item?.text) === index,
  );

  const shown = (value: string) => (live.rollup.complete ? value : "—");
  const shownInvestment = (value: number | null) =>
    value != null ? formatCompactCurrency(value) : "—";

  function evidenceNodes(line: (typeof detail.lines)[number]) {
    return line.evidence.map((entry) => entry.citation);
  }

  async function persist(refreshRecommendation = false) {
    if (dirty) {
      setPending(true);
      setError(null);
      const nextDraft = persistDraft();
      const result = await saveBusinessCaseAction({
        projectId,
        draft: nextDraft,
        refreshRecommendation,
      });
      setPending(false);
      if (!result || "error" in result) {
        setError(
          result?.error === "locked"
            ? "This approved case is locked."
            : "The business case could not be saved.",
        );
        return null;
      }
      setDetail(result.detail);
      setDraft(toDraft(result.detail));
      setLiveAdoption(
        adoptionForScenario(result.detail.businessCase.scenario, {
          conservative: result.detail.businessCase.conservativeAdoption,
          expected: result.detail.businessCase.expectedAdoption,
          aggressive: result.detail.businessCase.aggressiveAdoption,
        }) ?? liveAdoption,
      );
    }

    router.push(intelligenceHref(projectId, "deployment"));
    return detail;
  }

  return (
    <div className="space-y-4 pb-6">
      {locked ? null : (
        <IntelligenceHeaderPortal>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => persist()}
          >
            Save
          </Button>
        </IntelligenceHeaderPortal>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex min-w-0 flex-col justify-center">
          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
            <StatMicro
              icon={CircleDollarSign}
              label="Consumption"
              value={shown(formatCompactCurrency(live.rollup.consumption))}
              iconColor={strengthColors.strong}
            />
            <StatMicro
              icon={TrendingUp}
              label="Value"
              value={shown(formatCompactCurrency(live.rollup.value))}
            />
            <StatMicro
              icon={Layers}
              label="Impacted"
              value={shown(formatCompactNumber(live.rollup.impacted))}
            />
            <StatMicro
              icon={Coins}
              label="ROC"
              value={shown(formatMultiple(live.rollup.roc))}
            />
            <StatMicro
              icon={Percent}
              label="ROI"
              value={shown(formatMultiple(live.rollup.roi))}
            />
            <StatMicro
              icon={Clock}
              label="Payback"
              value={shown(formatMonths(live.rollup.paybackMonths))}
            />
            <StatMicro
              icon={Gauge}
              label="Acceleration"
              value={shown(formatCompactCurrency(live.rollup.roa))}
            />
            <StatMicro
              icon={Wallet}
              label="Investment"
              value={
                investmentTotal != null
                  ? formatCompactCurrency(investmentTotal)
                  : "—"
              }
            />
          </div>
        </Card>

        <Card className="min-w-0">
          <h2 className="text-lg font-semibold">Consumption & Value</h2>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              Work Per Year
            </span>
            <input
              type="number"
              min={0}
              step="1"
              disabled={locked}
              placeholder="e.g. 12000"
              value={numberValue(draft.lines[0]?.annualVolume ?? null)}
              onChange={(event) =>
                updateLine(setDraft, 0, {
                  annualVolume: readNumber(event.target.value),
                })
              }
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
            />
            <p className="mt-1.5 text-xs text-muted">
              How many cases, chats, tickets, or other interactions occur in a typical year?
            </p>
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Work Item Cost</span>
            <input
              type="number"
              min={0}
              step="any"
              disabled={locked}
              placeholder="e.g. 1.25"
              value={numberValue(draft.lines[0]?.unitPrice ?? null)}
              onChange={(event) =>
                updateLine(setDraft, 0, {
                  unitPrice: readNumber(event.target.value),
                })
              }
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
            />
            <p className="mt-1.5 text-xs text-muted">
              What do you pay each time this happens? We’ll use this to forecast consumption.
            </p>
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              Share An Agent Could Handle
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={80}
                step={1}
                disabled={locked}
                value={Math.round(liveAdoption * 100)}
                onInput={(event) =>
                  slideAdoption(Number(event.currentTarget.value))
                }
                onChange={(event) =>
                  slideAdoption(Number(event.currentTarget.value))
                }
                className="enigma-slider"
                style={
                  {
                    "--slider-progress": `${((Math.round(liveAdoption * 100) - 1) / 79) * 100}%`,
                  } as CSSProperties
                }
                aria-label="Share An Agent Could Handle"
              />
              <div className="w-24 shrink-0 text-right">
                {shareThresholdLabel ? (
                  <p className="text-xs text-muted">{shareThresholdLabel}</p>
                ) : null}
                <p className="text-sm">{formatPercent(adoption)}</p>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              What percentage of this work could an agent realistically handle, even if it isn't fully automated?
            </p>
          </label>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">How to Proceed</h2>
        <div className="mt-3 space-y-3">
          <FoldCard
            title="Deployment Justification"
            open={showingJustification}
            onToggle={() => setShowingJustification((open) => !open)}
          >
            <div className="space-y-2.5 text-sm leading-relaxed">
              {justificationNarrative
                .split(/\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </FoldCard>
          <FoldCard
            title="Enigma Recommendation"
            open={showingRecommendation}
            onToggle={() => setShowingRecommendation((open) => !open)}
          >
            <div className="space-y-2.5 text-sm leading-relaxed">
              {live.rollup.complete ? (
                <>
                  <p className="font-medium">
                    {recommendationLabel[live.recommendationState]}
                  </p>
                  {recommendationNarrative
                    .split(/\n+/)
                    .map((paragraph) => paragraph.trim())
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <CitedParagraph key={index} text={paragraph} />
                    ))}
                </>
              ) : (
                <p>
                  Enigma could not complete a proposal from this run yet. It will
                  not invent a Salesforce price to fill the gap.
                </p>
              )}
            </div>
          </FoldCard>
          <FoldCard
            title="Supporting Evidence"
            open={showingEvidence}
            onToggle={() => setShowingEvidence((open) => !open)}
          >
            <div className="space-y-6">
              {detail.lines.map((line) => (
                <OpportunityFlow
                  key={line.id}
                  area={line.businessArea}
                  process={line.businessProcess}
                  capability={line.recommendedCapability}
                  signals={line.supportingSignals}
                  evidence={evidenceNodes(line)}
                  reasoning={line.finding}
                  consumptionDrivers={line.consumptionDrivers}
                  valueDrivers={line.valueDrivers}
                  constraints={line.constraints}
                  dependencies={line.dependencies}
                />
              ))}
            </div>
          </FoldCard>
          <FoldCard
            title="Gaps / Risks"
            open={showingGaps}
            onToggle={() => setShowingGaps((open) => !open)}
          >
            {risks.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {risks.map((risk) => (
                  <li
                    key={risk.text}
                    className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-4"
                  >
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: strengthColors[risk.tone] }}
                    />
                    <span>{risk.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Required model inputs are present. Customer assumptions still need
                validation before they are treated as official prices.
              </p>
            )}
          </FoldCard>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Investment</h2>
          <p className="mt-1 text-xs text-muted">
            What they said it would cost to stand this up.
          </p>
          <div className="mt-3 border-t border-border" />
          <ModelRow
            label="Discovery"
            value={shownInvestment(projectInvestment.discovery)}
          />
          <ModelRow
            label="Implementation"
            value={shownInvestment(projectInvestment.implementation)}
          />
          <ModelRow
            label="Knowledge"
            value={shownInvestment(projectInvestment.knowledge)}
          />
          <ModelRow
            label="Change Management"
            value={shownInvestment(projectInvestment.change)}
          />
          <ModelRow
            label="Services"
            value={shownInvestment(projectInvestment.services)}
          />
          <ModelRow
            label="Other"
            value={shownInvestment(projectInvestment.other)}
          />
          <div className="mt-4 border-t border-border pt-3">
            <ModelRow
              label="Total"
              value={
                investmentTotal != null
                  ? formatCompactCurrency(investmentTotal)
                  : "—"
              }
              strong
            />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Assumptions & Calculations</h2>
          <p className="mt-1 text-xs text-muted">
            Customer input and the numbers this run produced.
          </p>
          <div className="mt-3 border-t border-border" />
          <ModelRow
            label="Work Per Year"
            value={formatCompactNumber(volume || null)}
          />
          <ModelRow
            label="Work Item Cost"
            value={formatCurrencyPrecise(draft.lines[0]?.unitPrice ?? null)}
          />
          <ModelRow
            label="Hours On Work Item"
            value={
              draft.lines[0]?.hoursSavedPerUnit != null
                ? String(draft.lines[0].hoursSavedPerUnit)
                : "—"
            }
          />
          <ModelRow
            label="Labor Cost / Hour"
            value={formatCurrencyPrecise(draft.lines[0]?.hourlyCost ?? null)}
          />
          <ModelRow
            label="Share An Agent Could Handle"
            value={formatPercent(adoption)}
          />
          <ModelRow
            label="Work The Agent Would Take"
            value={shown(formatCompactNumber(live.rollup.impacted))}
            hint={productFormula(
              formatCompactNumber(volume || null),
              formatPercent(adoption),
            )}
          />
          <ModelRow
            label="Value"
            value={shown(formatCompactCurrency(live.rollup.value))}
            hint={productFormula(
              formatCompactNumber(workTaken),
              hoursOnItem != null ? String(hoursOnItem) : null,
              formatCurrencyPrecise(laborCost),
            )}
          />
          <ModelRow
            label="Consumption"
            value={shown(formatCompactCurrency(live.rollup.consumption))}
            hint={productFormula(
              formatCompactNumber(workTaken),
              formatCurrencyPrecise(workItemCost),
            )}
          />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Return On Acceleration</h2>
          <p className="mt-1 text-xs text-muted">
            What you gain by getting them live sooner.
          </p>
          <div className="mt-3 border-t border-border" />
          <ModelRow
            label="Without Enigma"
            value={
              draft.baselineDays != null
                ? `${draft.baselineDays} days`
                : "—"
            }
          />
          <ModelRow
            label="With Enigma"
            value={
              draft.enigmaDays != null ? `${draft.enigmaDays} days` : "—"
            }
          />
          <ModelRow
            label="Days Saved"
            value={
              daysAccelerated != null ? `${daysAccelerated} days` : "—"
            }
            strong
          />
        </Card>
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : null}
    </div>
  );
}


function FoldCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-base font-semibold">{title}</span>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent text-lg font-semibold leading-none text-accent-fg"
        >
          {open ? "-" : "+"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-4">{children}</div>
      ) : null}
    </div>
  );
}

function nearestScenario(
  value: number,
  rates: Record<Scenario, number>,
  current: Scenario,
): Scenario {
  return scenarios.reduce((best, scenario) => {
    const nextDistance = Math.abs(rates[scenario] - value);
    const bestDistance = Math.abs(rates[best] - value);
    if (nextDistance < bestDistance) {
      return scenario;
    }
    if (nextDistance === bestDistance && scenario === current) {
      return scenario;
    }
    return best;
  });
}

function StatMicro({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  iconColor?: string;
}) {
  const empty = value === "—";

  return (
    <div className="flex items-center gap-4">
      <span
        className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground"
        style={iconColor ? { color: iconColor } : undefined}
      >
        <Icon className="size-7" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p
          className={`truncate text-xl ${empty ? "text-muted" : "font-medium"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ModelRow({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="mt-3 flex items-baseline justify-between gap-4">
      <p className={`min-w-0 text-sm ${strong ? "font-bold" : "text-muted"}`}>
        {label}
      </p>
      <p className="shrink-0 text-right">
        <span
          className={`text-sm ${strong ? "font-bold" : ""}`}
        >
          {value}
        </span>
        {hint ? (
          <span className="ml-1.5 font-normal text-xs text-muted">({hint})</span>
        ) : null}
      </p>
    </div>
  );
}

function productFormula(...parts: Array<string | null | undefined>) {
  if (parts.some((part) => part == null || part === "—")) {
    return undefined;
  }

  return parts.join(" × ");
}

function CitedParagraph({ text }: { text: string }) {
  return (
    <p>
      {splitCitedCopy(text).map((part, index) =>
        part.cited ? (
          <span key={index} className="text-accent">
            ({part.text})
          </span>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

function toDraft(detail: BusinessCaseDetail): BusinessCaseDraft {
  return {
    scenario: detail.businessCase.scenario,
    conservativeAdoption: detail.businessCase.conservativeAdoption,
    expectedAdoption: detail.businessCase.expectedAdoption,
    aggressiveAdoption: detail.businessCase.aggressiveAdoption,
    baselineDays: detail.businessCase.baselineDays,
    enigmaDays: detail.businessCase.enigmaDays,
    lines: detail.lines.map((line) => ({
      opportunityId: line.opportunityId,
      annualVolume: line.annualVolume,
      unitPrice: line.unitPrice,
      hoursSavedPerUnit: line.hoursSavedPerUnit,
      hourlyCost: line.hourlyCost,
      implementationCost: line.implementationCost,
    })),
  };
}

function updateLine(
  setDraft: Dispatch<SetStateAction<BusinessCaseDraft>>,
  index: number,
  patch: Partial<BusinessCaseDraft["lines"][number]>,
) {
  setDraft((current) => ({
    ...current,
    lines: current.lines.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line,
    ),
  }));
}

function numberValue(value: number | null) {
  return value == null ? "" : String(value);
}

function readNumber(value: string) {
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
