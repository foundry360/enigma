import {
  fallbackRecommendation,
  rollUpCase,
  scenarios,
  type CaseRollup,
  type LineAssumptions,
  type RecommendationState,
  type Scenario,
} from "@/modules/economics/model";
import type { OrgIntelligence } from "@/modules/intelligence/org-model";

export const forecastDecisions = [
  "favorable",
  "favorable_with_conditions",
  "requires_validation",
  "not_justified",
] as const;

export type ForecastDecision = (typeof forecastDecisions)[number];

export const forecastDecisionLabel: Record<ForecastDecision, string> = {
  favorable:
    "The modeled economics are strong and no major deployment dependency is unresolved.",
  favorable_with_conditions:
    "The business case is strong, but specific conditions should be validated before proceeding.",
  requires_validation:
    "The opportunity is promising, but one or more assumptions materially affect the forecast.",
  not_justified:
    "The modeled economics do not support proceeding under the current assumptions.",
};

export type ForecastScenarioRow = {
  name: Scenario;
  workPerYear: number | null;
  agentShare: number | null;
  impactedWork: number | null;
  workItemCost: number | null;
  hoursOnItem: number | null;
  laborCost: number | null;
  consumption: number | null;
  annualValue: number | null;
  netAnnual: number | null;
  roc: number | null;
  complete: boolean;
};

export type ForecastCondition = {
  type: string;
  title: string;
  description: string;
  source: string;
};

export type ForecastDependency = {
  title: string;
  description: string;
  source: string;
};

export type ForecastRisk = {
  title: string;
  description: string;
  affectedAssumption: string;
  validation: string;
  source: string;
};

export type ForecastSensitivity = {
  variable: string;
  effect: string;
  source: "calculated" | "observed";
};

export type ForecastPathStage = {
  id: "validate" | "design" | "pilot" | "scale";
  title: string;
  objective: string;
  assumptions: string[];
  validation: string[];
  couldChange: string[];
};

export type ForecastBaseline = {
  scenario: Scenario;
  workPerYear: number | null;
  agentShare: number | null;
  impactedWork: number | null;
  workItemCost: number | null;
  hoursOnItem: number | null;
  laborCost: number | null;
  consumption: number | null;
  annualValue: number | null;
  netAnnual: number | null;
  roc: number | null;
};

export type DeploymentForecast = {
  opportunityName: string | null;
  opportunityType: string | null;
  description: string | null;
  capability: string | null;
  process: string | null;
  area: string | null;
  confidence: string | null;
  environmentName: string | null;
  caseStatus: "planning" | "saved" | "approved";
  primaryWork: string | null;
  supportingWork: string[];
  workPerYear: number | null;
  workItemCost: number | null;
  hoursOnItem: number | null;
  laborCost: number | null;
  selectedScenario: Scenario;
  scenarios: Record<Scenario, ForecastScenarioRow>;
  decision: ForecastDecision;
  recommendationState: RecommendationState;
  position: string;
  conditions: ForecastCondition[];
  dependencies: ForecastDependency[];
  risks: ForecastRisk[];
  sensitivities: ForecastSensitivity[];
  path: ForecastPathStage[];
  baseline: ForecastBaseline | null;
  gaps: string[];
};

export type ForecastOpportunity = {
  name: string;
  key?: string | null;
  finding: string;
  area: string;
  process: string;
  capability: string;
  confidence: string;
  constraints: string[];
  dependencies: string[];
};

export function buildDeploymentForecast(input: {
  caseStatus: "planning" | "saved" | "approved";
  selectedScenario: Scenario;
  conservativeAdoption: number | null;
  expectedAdoption: number | null;
  aggressiveAdoption: number | null;
  lines: LineAssumptions[];
  opportunity: ForecastOpportunity | null;
  recommendationState: RecommendationState;
  gaps: string[];
  hasWeakSignals: boolean;
  weakSignals: string[];
  environmentName: string | null;
  org: OrgIntelligence | null;
  storedBaseline?: ForecastBaseline | null;
}): DeploymentForecast {
  const line = input.lines[0] ?? null;
  const workPerYear = line?.annualVolume ?? null;
  const workItemCost = line?.unitPrice ?? null;
  const hoursOnItem = line?.hoursSavedPerUnit ?? null;
  const laborCost = line?.hourlyCost ?? null;
  const rates: Record<Scenario, number | null> = {
    conservative: input.conservativeAdoption,
    expected: input.expectedAdoption,
    aggressive: input.aggressiveAdoption,
  };
  const scenarioRows = Object.fromEntries(
    scenarios.map((name) => [
      name,
      scenarioRow({
        name,
        share: rates[name],
        lines: input.lines,
      }),
    ]),
  ) as Record<Scenario, ForecastScenarioRow>;
  const selected = scenarioRows[input.selectedScenario];
  const conditions = forecastConditions(input);
  const dependencies = forecastDependencies(input);
  const risks = forecastRisks(input, selected);
  const decision = forecastDecision({
    selected,
    recommendationState: input.recommendationState,
    gaps: input.gaps,
    hasWeakSignals: input.hasWeakSignals,
    conditions,
    dependencies,
  });

  return {
    opportunityName: input.opportunity?.name ?? null,
    opportunityType: input.opportunity?.key ?? null,
    description: input.opportunity?.finding ?? null,
    capability: input.opportunity?.capability ?? null,
    process: input.opportunity?.process ?? null,
    area: input.opportunity?.area ?? null,
    confidence: input.opportunity?.confidence ?? null,
    environmentName:
      input.environmentName ?? input.org?.environment.orgName ?? null,
    caseStatus: input.caseStatus,
    primaryWork:
      input.org?.workload.primary[0]?.label ??
      input.opportunity?.process ??
      null,
    supportingWork: [
      ...(input.org?.workload.secondary.map((item) => item.label) ?? []),
      ...(input.org?.workload.context.map((item) => item.label) ?? []),
    ].filter((item, index, items) => items.indexOf(item) === index),
    workPerYear,
    workItemCost,
    hoursOnItem,
    laborCost,
    selectedScenario: input.selectedScenario,
    scenarios: scenarioRows,
    decision,
    recommendationState: input.recommendationState,
    position: forecastPosition({
      decision,
      selected,
      conditions,
      risks,
    }),
    conditions,
    dependencies,
    risks,
    sensitivities: forecastSensitivities({
      workItemCost,
      hoursOnItem,
      laborCost,
      org: input.org,
    }),
    path: forecastPath({
      opportunity: input.opportunity,
      conditions,
      risks,
      selected,
    }),
    baseline:
      input.storedBaseline ??
      (input.caseStatus === "approved" ? toBaseline(selected) : null),
    gaps: input.gaps,
  };
}

export function toBaseline(row: ForecastScenarioRow): ForecastBaseline {
  return {
    scenario: row.name,
    workPerYear: row.workPerYear,
    agentShare: row.agentShare,
    impactedWork: row.impactedWork,
    workItemCost: row.workItemCost,
    hoursOnItem: row.hoursOnItem,
    laborCost: row.laborCost,
    consumption: row.consumption,
    annualValue: row.annualValue,
    netAnnual: row.netAnnual,
    roc: row.roc,
  };
}

export function baselineFromSnapshot(
  snapshot: Record<string, unknown> | null,
): ForecastBaseline | null {
  if (!snapshot) {
    return null;
  }

  const stored = snapshot.forecastBaseline;
  if (stored && typeof stored === "object") {
    const row = stored as Partial<ForecastBaseline>;
    if (row.scenario && scenarios.includes(row.scenario)) {
      return {
        scenario: row.scenario,
        workPerYear: numberOrNull(row.workPerYear),
        agentShare: numberOrNull(row.agentShare),
        impactedWork: numberOrNull(row.impactedWork),
        workItemCost: numberOrNull(row.workItemCost),
        hoursOnItem: numberOrNull(row.hoursOnItem),
        laborCost: numberOrNull(row.laborCost),
        consumption: numberOrNull(row.consumption),
        annualValue: numberOrNull(row.annualValue),
        netAnnual: numberOrNull(row.netAnnual),
        roc: numberOrNull(row.roc),
      };
    }
  }

  const rollup = snapshot.rollup as Partial<CaseRollup> | undefined;
  if (!rollup) {
    return null;
  }

  return {
    scenario: "expected",
    workPerYear: null,
    agentShare: null,
    impactedWork: numberOrNull(rollup.impacted),
    workItemCost: null,
    hoursOnItem: null,
    laborCost: null,
    consumption: numberOrNull(rollup.consumption),
    annualValue: numberOrNull(rollup.value),
    netAnnual: numberOrNull(rollup.netAnnual),
    roc: numberOrNull(rollup.roc),
  };
}

export function formatForecastBrief(forecast: DeploymentForecast) {
  const selected = forecast.scenarios[forecast.selectedScenario];
  const conditions = forecast.conditions
    .map((item) => `${item.title}: ${item.description}`)
    .join(" ");
  const risks = forecast.risks
    .map(
      (item) =>
        `${item.title} affects ${item.affectedAssumption}. ${item.description}`,
    )
    .join(" ");

  return [
    `Forecast for ${forecast.opportunityName ?? "the promoted opportunity"}.`,
    `Environment: ${forecast.environmentName ?? "not named"}. Case status: ${forecast.caseStatus}.`,
    `Primary work: ${forecast.primaryWork ?? "not observed"}. Supporting work: ${forecast.supportingWork.join(", ") || "none named"}.`,
    `Selected scenario: ${forecast.selectedScenario}. Work per year ${selected.workPerYear ?? "not set"}. Share ${selected.agentShare ?? "not set"}. Impacted ${selected.impactedWork ?? "not set"}. Work item cost ${selected.workItemCost ?? "not set"}. Hours ${selected.hoursOnItem ?? "not set"}. Labor ${selected.laborCost ?? "not set"}. Consumption ${selected.consumption ?? "not set"}. Annual value ${selected.annualValue ?? "not set"}. Net ${selected.netAnnual ?? "not set"}. ROC ${selected.roc ?? "not set"}.`,
    `Value method: Impacted x Hours On Work Item x Labor Cost / Hour. Consumption method: Impacted x Work Item Cost. Work Item Cost is a customer assumption, not an official Salesforce price.`,
    `Forecast decision: ${forecast.decision}. ${forecast.position}`,
    conditions ? `Conditions: ${conditions}` : "No named conditions.",
    forecast.dependencies.length
      ? `Dependencies: ${forecast.dependencies.map((item) => item.title).join("; ")}`
      : "No named dependencies.",
    risks ? `Forecast risks: ${risks}` : "No named forecast risks.",
    `Sensitivities: ${forecast.sensitivities.map((item) => `${item.variable}: ${item.effect}`).join(" ")}`,
  ].join("\n");
}

function scenarioRow(input: {
  name: Scenario;
  share: number | null;
  lines: LineAssumptions[];
}): ForecastScenarioRow {
  const line = input.lines[0] ?? null;
  const rollup = rollUpCase({
    lines: input.lines,
    adoption: input.share,
    baselineDays: null,
    enigmaDays: null,
  });

  return {
    name: input.name,
    workPerYear: line?.annualVolume ?? null,
    agentShare: input.share,
    impactedWork: rollup.impacted,
    workItemCost: line?.unitPrice ?? null,
    hoursOnItem: line?.hoursSavedPerUnit ?? null,
    laborCost: line?.hourlyCost ?? null,
    consumption: rollup.consumption,
    annualValue: rollup.value,
    netAnnual: rollup.netAnnual,
    roc: rollup.roc,
    complete: rollup.complete,
  };
}

function forecastDecision(input: {
  selected: ForecastScenarioRow;
  recommendationState: RecommendationState;
  gaps: string[];
  hasWeakSignals: boolean;
  conditions: ForecastCondition[];
  dependencies: ForecastDependency[];
}): ForecastDecision {
  const state = fallbackRecommendation({
    rollup: {
      complete: input.selected.complete,
      impacted: input.selected.impactedWork,
      consumption: input.selected.consumption,
      value: input.selected.annualValue,
      implementation: 1,
      operating: input.selected.consumption,
      year1: null,
      threeYearCost: null,
      netAnnual: input.selected.netAnnual,
      roi: null,
      paybackMonths: null,
      roc: input.selected.roc,
      roa: null,
      timeToValueDays: null,
    },
    gaps: input.gaps,
    hasWeakSignals: input.hasWeakSignals,
    confidence: "medium",
  });

  if (state === "do_not_proceed" || state === "defer") {
    return "not_justified";
  }
  if (state === "validate" || !input.selected.complete) {
    return "requires_validation";
  }
  if (
    state === "proceed_with_conditions" ||
    input.conditions.length > 0 ||
    input.dependencies.length > 0
  ) {
    return "favorable_with_conditions";
  }
  if (input.recommendationState === "proceed_with_conditions") {
    return "favorable_with_conditions";
  }
  return "favorable";
}

function forecastPosition(input: {
  decision: ForecastDecision;
  selected: ForecastScenarioRow;
  conditions: ForecastCondition[];
  risks: ForecastRisk[];
}) {
  const economics = input.selected.complete
    ? "The opportunity has a calculated economic case."
    : "The economic case is not complete enough to treat the totals as a decision.";
  const holds = [
    ...input.conditions.slice(0, 2).map((item) => item.title),
    ...input.risks.slice(0, 2).map((item) => item.title),
  ]
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 3);
  const hold =
    holds.length > 0
      ? ` The primary factors that could affect realization are ${joinAnd(holds)}.`
      : "";

  return `${economics} ${forecastDecisionLabel[input.decision]}${hold}`;
}

function forecastConditions(input: {
  opportunity: ForecastOpportunity | null;
  org: OrgIntelligence | null;
  weakSignals: string[];
}): ForecastCondition[] {
  const fromFindings = (input.org?.findings ?? [])
    .filter((finding) => finding.deploymentImplication)
    .map((finding) => ({
      type: finding.domain,
      title: finding.title,
      description: finding.deploymentImplication as string,
      source: finding.id,
    }));
  const fromConstraints = (input.opportunity?.constraints ?? []).map(
    (constraint, index) => ({
      type: "constraint",
      title: constraint,
      description: constraint,
      source: `opportunity-constraint-${index}`,
    }),
  );
  const fromSignals = input.weakSignals.map((title) => ({
    type: "signal",
    title,
    description: `${title} is still weak on the intelligence run and should be validated before treating the forecast as unconstrained.`,
    source: `signal:${title}`,
  }));

  return uniqueByTitle([...fromFindings, ...fromConstraints, ...fromSignals]);
}

function forecastDependencies(input: {
  opportunity: ForecastOpportunity | null;
  org: OrgIntelligence | null;
}): ForecastDependency[] {
  const fromOpportunity = (input.opportunity?.dependencies ?? []).map(
    (dependency, index) => ({
      title: dependency,
      description: dependency,
      source: `opportunity-dependency-${index}`,
    }),
  );
  const fromOrg = (input.org?.summary.constraints ?? [])
    .filter((item) => !/^nothing on this run/i.test(item))
    .map((item, index) => ({
      title: item,
      description: item,
      source: `org-constraint-${index}`,
    }));

  return uniqueByTitle([...fromOpportunity, ...fromOrg]);
}

function forecastRisks(
  input: {
    org: OrgIntelligence | null;
    weakSignals: string[];
    opportunity: ForecastOpportunity | null;
  },
  selected: ForecastScenarioRow,
): ForecastRisk[] {
  const risks: ForecastRisk[] = [];
  if (selected.agentShare != null) {
    risks.push({
      title: "Agent share",
      description: `Actual agent adoption may be below the modeled share.`,
      affectedAssumption: "Agent Share",
      validation: "Pilot the first topic and compare handled work to the modeled share.",
      source: "case-share",
    });
  }

  for (const gap of input.org?.summary.notObserved ?? []) {
    risks.push({
      title: gap,
      description: `${gap} was not observed on this run, so the forecast cannot treat it as known.`,
      affectedAssumption: assumptionForGap(gap),
      validation: "Do not invent a figure. Collect the missing observation or a customer input.",
      source: `not-observed:${gap}`,
    });
  }

  const write = input.org?.findings.find((item) =>
    item.relatedSignals.includes("writeback_control"),
  );
  if (write) {
    risks.push({
      title: write.title,
      description: write.businessImplication || write.summary,
      affectedAssumption: "Scope",
      validation: write.nextAction,
      source: write.id,
    });
  }

  const knowledge = input.org?.findings.find((item) => item.domain === "knowledge");
  if (knowledge) {
    risks.push({
      title: knowledge.title,
      description: knowledge.businessImplication || knowledge.summary,
      affectedAssumption: "Knowledge coverage",
      validation: knowledge.nextAction,
      source: knowledge.id,
    });
  }

  const access = input.org?.findings.find((item) =>
    item.relatedSignals.includes("access_surface"),
  );
  if (access) {
    risks.push({
      title: access.title,
      description: access.businessImplication || access.summary,
      affectedAssumption: "Access",
      validation: access.nextAction,
      source: access.id,
    });
  }

  return uniqueByTitle(risks);
}

function forecastSensitivities(input: {
  workItemCost: number | null;
  hoursOnItem: number | null;
  laborCost: number | null;
  org: OrgIntelligence | null;
}): ForecastSensitivity[] {
  const items: ForecastSensitivity[] = [
    {
      variable: "Agent Share",
      effect:
        "A higher share raises impacted work, annual value, and consumption together. ROC stays the same if hours, labor, and work item cost do not change.",
      source: "calculated",
    },
    {
      variable: "Work Per Year",
      effect:
        "A higher volume raises impacted work, annual value, and consumption together. ROC stays the same if unit costs do not change.",
      source: "calculated",
    },
    {
      variable: "Work Item Cost",
      effect:
        input.workItemCost == null
          ? "Work Item Cost is not set, so consumption and ROC stay blank."
          : "A higher work item cost raises consumption and lowers net annual and ROC. It does not change annual value.",
      source: "calculated",
    },
    {
      variable: "Hours On Work Item",
      effect:
        input.hoursOnItem == null
          ? "Hours are not set, so annual value is not calculated."
          : "More hours on each item raises annual value, net annual, and ROC. Consumption does not change.",
      source: "calculated",
    },
    {
      variable: "Labor Cost / Hour",
      effect:
        input.laborCost == null
          ? "Labor cost is not set, so annual value is not calculated."
          : "A higher labor rate raises annual value, net annual, and ROC. Consumption does not change.",
      source: "calculated",
    },
  ];

  if (input.org && !input.org.knowledge.coverageKnown) {
    items.push({
      variable: "Knowledge coverage",
      effect:
        "Coverage was not observed. Thin coverage would reduce realized share, not the calculated totals.",
      source: "observed",
    });
  }

  return items;
}

function forecastPath(input: {
  opportunity: ForecastOpportunity | null;
  conditions: ForecastCondition[];
  risks: ForecastRisk[];
  selected: ForecastScenarioRow;
}): ForecastPathStage[] {
  const named = input.opportunity
    ? `${input.opportunity.capability} on ${input.opportunity.process}`
    : "the promoted opportunity";
  const conditionTitles = input.conditions.map((item) => item.title).slice(0, 3);
  const riskTitles = input.risks.map((item) => item.title).slice(0, 3);

  return [
    {
      id: "validate",
      title: "Validate",
      objective:
        "Confirm the assumptions that materially affect the forecast before treating the totals as a decision.",
      assumptions: [
        "Work per year is a customer input.",
        "Hours and labor cost are customer inputs.",
        "Work item cost is a customer operating rate, not an official Salesforce price.",
      ],
      validation: conditionTitles.length
        ? conditionTitles
        : ["Complete work per year, hours, and labor cost on the business case."],
      couldChange: ["Work Per Year", "Hours On Work Item", "Labor Cost / Hour"],
    },
    {
      id: "design",
      title: "Design",
      objective: `Define the intended scope, boundaries, and operating model for ${named}.`,
      assumptions: [
        input.opportunity?.process
          ? `The work stays on ${input.opportunity.process}.`
          : "The work stays on the observed path.",
        "Write-back and access stay as narrow as the intelligence run requires.",
      ],
      validation: conditionTitles,
      couldChange: ["Scope", "Access", "Write-back"],
    },
    {
      id: "pilot",
      title: "Pilot",
      objective:
        "Test the expected agent share against real work without treating the forecast as already realized.",
      assumptions: [
        input.selected.agentShare != null
          ? "The modeled share is a planning rate, not an observed adoption."
          : "Share is not set.",
      ],
      validation: riskTitles,
      couldChange: ["Agent Share", "Knowledge coverage"],
    },
    {
      id: "scale",
      title: "Scale",
      objective:
        "Increase coverage only if actual handled work supports the forecast.",
      assumptions: ["Scale follows realized share, not the planning rate."],
      validation: ["Compare handled work to the forecast baseline."],
      couldChange: ["Agent Share", "Work Per Year"],
    },
  ];
}

function assumptionForGap(gap: string) {
  if (/volume|workload/i.test(gap)) {
    return "Work Per Year";
  }
  if (/quality|data/i.test(gap)) {
    return "Hours On Work Item";
  }
  if (/integrat/i.test(gap)) {
    return "Scope";
  }
  if (/knowledge|coverage/i.test(gap)) {
    return "Knowledge coverage";
  }
  return "Agent Share";
}

function uniqueByTitle<T extends { title: string }>(items: T[]) {
  return items.filter(
    (item, index, list) =>
      list.findIndex((entry) => entry.title === item.title) === index,
  );
}

function joinAnd(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
