"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  approveBusinessCaseAction,
  saveBusinessCaseAction,
} from "@/app/actions/business-case";
import { ConfidenceIcon } from "@/components/intelligence/confidence-icon";
import { OpportunityFlow } from "@/components/intelligence/opportunity-flow";
import { Badge } from "@/components/ui/badge";
import { strengthColors } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { intelligenceHref } from "@/lib/intelligence/routes";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrencyPrecise,
  formatMonths,
  formatMultiple,
  formatPercent,
  titleCase,
} from "@/lib/format";
import {
  fallbackNarratives,
  toBusinessCaseBriefing,
} from "@/modules/economics/briefing";
import type { BusinessCaseDetail } from "@/modules/economics/case-view";
import { assumptionSource } from "@/modules/economics/propose";
import {
  adoptionForScenario,
  defaultAdoption,
  normalizeAdoption,
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
  projectName,
  projectInvestment,
  detail: initial,
}: {
  projectId: string;
  projectName: string;
  projectInvestment: ProjectInvestment;
  detail: BusinessCaseDetail;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingRecommendation, setShowingRecommendation] = useState(true);
  const [showingEvidence, setShowingEvidence] = useState(false);
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
  const locked = detail.businessCase.status === "approved";
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(toDraft(detail)) ||
    Math.abs(liveAdoption - scenarioRates[draft.scenario]) > 0.0005;
  const primary = detail.lines[0];
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

  const scenarioViews = useMemo(
    () =>
      scenarios.map((scenario) => ({
        scenario,
        ...summarizeCase({
          lines: draft.lines,
          scenario,
          conservativeAdoption: scenarioRates.conservative,
          expectedAdoption: scenarioRates.expected,
          aggressiveAdoption: scenarioRates.aggressive,
          baselineDays: draft.baselineDays,
          enigmaDays: draft.enigmaDays,
          implementationCost: sumProjectInvestment(projectInvestment),
          hasWeakSignals: false,
          confidence,
        }).rollup,
      })),
    [
      confidence,
      draft.baselineDays,
      draft.enigmaDays,
      draft.lines,
      projectInvestment,
      scenarioRates,
    ],
  );

  const briefing = useMemo(
    () =>
      toBusinessCaseBriefing({
        opportunities: detail.lines.map((line, index) => ({
          name: line.opportunityName,
          process: line.businessProcess,
          capability: line.recommendedCapability,
          confidence: line.confidence,
          finding: line.finding,
          signals: line.supportingSignals.map((signal) => ({
            title: signal.title,
            strength: signal.strength,
          })),
          evidence: line.evidence.map((entry) => entry.citation),
          consumptionDrivers: line.consumptionDrivers,
          valueDrivers: line.valueDrivers,
          constraints: line.constraints,
          dependencies: line.dependencies,
          annualVolume: draft.lines[index]?.annualVolume ?? null,
          unitPrice: draft.lines[index]?.unitPrice ?? null,
        })),
        scenario: draft.scenario,
        adoption: liveAdoption,
        rollup: live.rollup,
        gaps: live.gaps,
        recommendationState: live.recommendationState,
      }),
    [detail.lines, draft, live, liveAdoption],
  );

  const narratives = fallbackNarratives(briefing);
  const recommendationNarrative =
    !dirty && detail.businessCase.recommendationNarrative
      ? detail.businessCase.recommendationNarrative
      : narratives.recommendationNarrative;
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

  function selectScenario(scenario: Scenario) {
    setDraft((current) => ({ ...current, scenario }));
    setLiveAdoption(scenarioRates[scenario]);
  }

  function slideAdoption(percent: number) {
    const next = percent / 100;
    setLiveAdoption(next);
    setDraft((current) => ({
      ...current,
      scenario: nearestScenario(next, scenarioRates, current.scenario),
    }));
  }

  const valuePerUnit =
    live.rollup.complete && live.rollup.impacted
      ? (live.rollup.value ?? 0) / live.rollup.impacted
      : draft.lines[0]?.hoursSavedPerUnit != null &&
          draft.lines[0]?.hourlyCost != null
        ? draft.lines[0].hoursSavedPerUnit * draft.lines[0].hourlyCost
        : null;
  const investmentTotal = sumProjectInvestment(projectInvestment);
  const daysAccelerated =
    draft.baselineDays != null &&
    draft.enigmaDays != null &&
    draft.baselineDays > draft.enigmaDays
      ? draft.baselineDays - draft.enigmaDays
      : null;
  const workLabel = workUnitLabel(primary?.candidateKey);
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
    draft.lines.some(
      (line, index) =>
        assumptionSource(line.unitPrice, detail.lines[index]?.proposed.unitPrice ?? 0) ===
        "Enigma Assumption",
    )
      ? {
          text: "Cost per unit is an Enigma working assumption and needs customer validation.",
          tone: "mixed" as const,
        }
      : null,
  ].filter(
    (item, index, items): item is { text: string; tone: "weak" | "mixed" } =>
      Boolean(item) &&
      items.findIndex((entry) => entry?.text === item?.text) === index,
  );

  const shown = (value: string) => (live.rollup.complete ? value : "—");
  const shownInvestment = (value: number | null) =>
    value != null ? formatCompactCurrency(value) : "—";

  async function persist(refreshRecommendation = true) {
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
    return result.detail;
  }

  async function approve() {
    setPending(true);
    setError(null);
    const saved = await saveBusinessCaseAction({
      projectId,
      draft: persistDraft(),
      refreshRecommendation: true,
    });
    if (!saved || "error" in saved) {
      setPending(false);
      setError(
        saved?.error === "locked"
          ? "This approved case is locked."
          : "The business case could not be saved.",
      );
      return;
    }

    const result = await approveBusinessCaseAction(projectId);
    setPending(false);
    if (!result || "error" in result) {
      setDetail(saved.detail);
      setDraft(toDraft(saved.detail));
      setLiveAdoption(
        adoptionForScenario(saved.detail.businessCase.scenario, {
          conservative: saved.detail.businessCase.conservativeAdoption,
          expected: saved.detail.businessCase.expectedAdoption,
          aggressive: saved.detail.businessCase.aggressiveAdoption,
        }) ?? liveAdoption,
      );
      setError(
        result?.error === "incomplete"
          ? "Complete the required assumptions before approving."
          : "The business case could not be approved.",
      );
      return;
    }
    setDetail(result.detail);
    setDraft(toDraft(result.detail));
    router.push(intelligenceHref(projectId, "deployment"));
  }

  return (
    <div className="space-y-4 pb-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {projectName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {caseScope(detail.lines)}
            </p>
            {detail.businessCase.status !== "draft" || confidence ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {detail.businessCase.status !== "draft" ? (
                  <Badge>
                    {titleCase(detail.businessCase.status.replaceAll("_", " "))}
                  </Badge>
                ) : null}
                {confidence ? (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <ConfidenceIcon
                      confidence={confidence}
                      className="size-[22px] -translate-y-0.5"
                    />
                    {titleCase(confidence)} Confidence
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {locked ? null : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending || !dirty}
                  onClick={() => persist(true)}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  disabled={pending || !live.rollup.complete || live.gaps.length > 0}
                  onClick={approve}
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric
          label="Consumption"
          value={shown(formatCompactCurrency(live.rollup.consumption))}
          hint="Annual agent consumption"
          estimate
        />
        <Metric
          label="Value"
          value={shown(formatCompactCurrency(live.rollup.value))}
          hint="Annual business value"
          estimate
        />
        <Metric
          label="ROI"
          value={shown(formatMultiple(live.rollup.roi))}
          hint="Net annual / investment"
          estimate
        />
        <Metric
          label="Payback"
          value={shown(formatMonths(live.rollup.paybackMonths))}
          hint="Months to recover investment"
          estimate
        />
        <Metric
          label="Accel."
          value={shown(formatCompactCurrency(live.rollup.roa))}
          hint="Potential accelerated value"
          estimate
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Consumption & Value</h2>
            <p className="mt-1 text-sm text-muted">
              {scenarioLabel[draft.scenario]} applies {formatPercent(adoption)} of{" "}
              {formatCompactNumber(volume || null)} {workLabel.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Scenario">
            {scenarios.map((scenario) => {
              const selected = draft.scenario === scenario;
              return (
                <button
                  key={scenario}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={locked}
                  onClick={() => selectScenario(scenario)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-foreground hover:bg-surface-2"
                  }`}
                >
                  {scenarioLabel[scenario]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Total cases</span>
            <input
              type="number"
              min={0}
              step="1"
              disabled={locked}
              value={numberValue(draft.lines[0]?.annualVolume ?? null)}
              onChange={(event) =>
                updateLine(setDraft, 0, {
                  annualVolume: readNumber(event.target.value),
                })
              }
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Adoption</span>
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
                aria-label="Adoption"
              />
              <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted">
                {formatPercent(adoption)}
              </span>
            </div>
          </label>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <ModelTile
            title="Annual Consumption"
            value={shown(formatCompactCurrency(live.rollup.consumption))}
            barClass="bg-accent"
            fill={barFill(
              live.rollup.consumption,
              scenarioViews.map((item) => item.consumption),
            )}
            chips={[
              { label: "Cases", value: formatCompactNumber(volume || null) },
              { label: "Adoption", value: formatPercent(adoption) },
            ]}
          />
          <ModelTile
            title="Annual Business Value"
            value={shown(formatCompactCurrency(live.rollup.value))}
            barClass="bg-[#3ECF8E]"
            fill={barFill(
              live.rollup.value,
              scenarioViews.map((item) => item.value),
            )}
            chips={[
              {
                label: "Cases impacted",
                value: shown(formatCompactNumber(live.rollup.impacted)),
              },
              {
                label: "Value / case",
                value: shown(formatCurrencyPrecise(valuePerUnit)),
              },
              {
                label: "ROI",
                value: shown(formatMultiple(live.rollup.roi)),
                valueClass: "text-[#3ECF8E]",
              },
            ]}
          />
        </div>
        <p className="mt-4 text-xs text-muted">
          ROI is value delivered per dollar of entered project investment —
          discovery, implementation, knowledge, change management, services,
          and other — not just usage.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Recommendation</h2>
        <div className="mt-3 space-y-3">
          <FoldCard
            title="Recommendation"
            open={showingRecommendation}
            onToggle={() => setShowingRecommendation((open) => !open)}
          >
            <p className="text-sm leading-relaxed">
              {live.rollup.complete
                ? recommendationNarrative
                : "Enigma could not complete a proposal from this run yet. It will not invent a Salesforce price to fill the gap."}
            </p>
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
                  evidence={line.evidence.map((entry) => entry.citation)}
                  reasoning={line.finding}
                  consumptionDrivers={line.consumptionDrivers}
                  valueDrivers={line.valueDrivers}
                  constraints={line.constraints}
                  dependencies={line.dependencies}
                />
              ))}
            </div>
          </FoldCard>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Investment</h2>
          <p className="mt-1 text-xs text-muted">
            Based on customer-provided figures and assumptions.
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
            label="Change management"
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
          <h2 className="text-lg font-semibold">Assumptions & Evidence</h2>
          <p className="mt-1 text-xs text-muted">
            Inputs inherited from intelligence and the live consumption model.
          </p>
          <div className="mt-3 border-t border-border" />
          <ModelRow
            label={`Annual ${workLabel}`}
            value={formatCompactNumber(volume || null)}
            hint={
              primary
                ? assumptionSource(
                    draft.lines[0]?.annualVolume ?? null,
                    primary.proposed.annualVolume,
                  )
                : undefined
            }
          />
          <ModelRow
            label="Automation rate"
            value={formatPercent(adoption)}
            hint="Enigma Assumption"
          />
          <ModelRow
            label={`Cost / ${workLabel.slice(0, -1).toLowerCase()}`}
            value={shown(formatCurrencyPrecise(valuePerUnit))}
            hint="Enigma Assumption"
          />
          <ModelRow
            label="Consumption"
            value={shown(formatCompactCurrency(live.rollup.consumption))}
            hint="Calculated"
          />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Return On Acceleration</h2>
          <p className="mt-1 text-xs text-muted">
            The value unlocked by accelerating time to deployment.
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
            label="Days saved"
            value={
              daysAccelerated != null ? `${daysAccelerated} days` : "—"
            }
            strong
          />
          <p className="mt-4 text-xs font-medium text-muted">
            Potential value of landing this earlier
          </p>
          <p className="mt-2 flex items-center gap-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {draft.baselineDays != null && draft.enigmaDays != null ? (
              daysAccelerated != null && daysAccelerated > 0 ? (
                <TrendingUp
                  aria-hidden="true"
                  className="size-6 shrink-0"
                  style={{ color: strengthColors.strong }}
                />
              ) : (
                <TrendingDown
                  aria-hidden="true"
                  className="size-6 shrink-0"
                  style={{ color: strengthColors.weak }}
                />
              )
            ) : null}
            <span>{shown(formatCompactCurrency(live.rollup.roa))}</span>
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Gaps / Risks</h2>
        {risks.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {risks.map((risk) => (
              <li
                key={risk.text}
                className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2"
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
          <p className="mt-3 text-sm text-muted">
            Required model inputs are present. Customer assumptions still need
            validation before they are treated as official prices.
          </p>
        )}
      </Card>

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
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">{title}</span>
        <span
          aria-hidden="true"
          className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[11px] font-semibold leading-none text-accent-fg"
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

function barFill(
  value: number | null | undefined,
  series: Array<number | null | undefined>,
) {
  const max = Math.max(0, ...series.filter((item): item is number => item != null));
  if (!value || max === 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / max) * 100));
}

function ModelTile({
  title,
  value,
  fill,
  barClass,
  chips,
}: {
  title: string;
  value: string;
  fill: number;
  barClass: string;
  chips: { label: string; value: string; valueClass?: string }[];
}) {
  return (
    <div className="rounded-md bg-surface-2 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <div className={`mt-4 h-1.5 rounded-full ${barClass}`}>
        <span className="sr-only">{fill}% of aggressive scenario</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {chips.map((chip) => (
          <div key={chip.label} className="min-w-0 rounded-md bg-background px-2.5 py-2">
            <p className="truncate text-sm text-muted">{chip.label}</p>
            <p
              className={`mt-1 truncate font-mono text-base font-semibold tabular-nums ${chip.valueClass ?? ""}`}
            >
              {chip.value}
            </p>
          </div>
        ))}
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
      <p className={`text-sm ${strong ? "font-bold" : "text-muted"}`}>{label}</p>
      <p className="text-right">
        <span
          className={`font-mono text-sm tabular-nums ${strong ? "font-bold" : ""}`}
        >
          {value}
        </span>
        {hint ? <span className="ml-2 text-xs text-muted">{hint}</span> : null}
      </p>
    </div>
  );
}

function caseScope(lines: BusinessCaseDetail["lines"]) {
  if (lines.length === 0) {
    return "Promoted opportunities";
  }

  const areas = unique(lines.map((line) => line.businessArea));
  const capabilities = unique(lines.map((line) => line.recommendedCapability));
  const area = joinAnd(areas);
  const capability = joinAnd(capabilities);

  if (area && capability) {
    return `${area} · ${capability}`;
  }

  return area || capability;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function joinAnd(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function workUnitLabel(key: string | undefined) {
  if (key === "case_service_agent") {
    return "Cases";
  }
  if (key === "knowledge_assist") {
    return "Answers";
  }
  if (key === "guided_case_flow") {
    return "Paths";
  }
  return "Units";
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
