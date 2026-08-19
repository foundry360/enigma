export const scenarios = ["conservative", "expected", "aggressive"] as const;

export type Scenario = (typeof scenarios)[number];

export const defaultAdoption: Record<Scenario, number> = {
  conservative: 0.1,
  expected: 0.15,
  aggressive: 0.25,
};

export const recommendationStates = [
  "proceed",
  "proceed_with_conditions",
  "validate",
  "defer",
  "do_not_proceed",
] as const;

export type RecommendationState = (typeof recommendationStates)[number];

export const recommendationLabel: Record<RecommendationState, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with Conditions",
  validate: "Validate Assumptions",
  defer: "Defer",
  do_not_proceed: "Do Not Proceed",
};

export function isScenario(value: string): value is Scenario {
  return scenarios.includes(value as Scenario);
}

export function isRecommendationState(
  value: string,
): value is RecommendationState {
  return recommendationStates.includes(value as RecommendationState);
}

export type LineAssumptions = {
  annualVolume: number | null;
  unitPrice: number | null;
  hoursSavedPerUnit: number | null;
  hourlyCost: number | null;
  implementationCost: number | null;
};

export type LineResult = {
  impacted: number;
  consumption: number | null;
  value: number;
  implementation: number;
};

export type CaseRollup = {
  complete: boolean;
  impacted: number | null;
  consumption: number | null;
  value: number | null;
  implementation: number | null;
  operating: number | null;
  year1: number | null;
  threeYearCost: number | null;
  netAnnual: number | null;
  roi: number | null;
  paybackMonths: number | null;
  roc: number | null;
  roa: number | null;
  timeToValueDays: number | null;
};

export type CaseInputs = {
  lines: LineAssumptions[];
  adoption: number | null;
  baselineDays: number | null;
  enigmaDays: number | null;
  implementationCost?: number | null;
};

export function isLineComplete(line: LineAssumptions) {
  return (
    isPresent(line.annualVolume) &&
    isPresent(line.hoursSavedPerUnit) &&
    isPresent(line.hourlyCost)
  );
}

export function calculateLine(
  line: LineAssumptions,
  adoption: number,
): LineResult | null {
  if (!isLineComplete(line) || !isPresent(adoption)) {
    return null;
  }

  const volume = line.annualVolume as number;
  const impacted = volume * adoption;

  return {
    impacted,
    consumption: isPresent(line.unitPrice)
      ? impacted * line.unitPrice
      : null,
    value:
      impacted *
      (line.hoursSavedPerUnit as number) *
      (line.hourlyCost as number),
    implementation: line.implementationCost ?? 0,
  };
}

export function emptyRollup(timeToValueDays: number | null = null): CaseRollup {
  return {
    complete: false,
    impacted: null,
    consumption: null,
    value: null,
    implementation: null,
    operating: null,
    year1: null,
    threeYearCost: null,
    netAnnual: null,
    roi: null,
    paybackMonths: null,
    roc: null,
    roa: null,
    timeToValueDays,
  };
}

export function rollUpCase(input: CaseInputs): CaseRollup {
  const adoption = isPresent(input.adoption) ? input.adoption : null;
  const timeToValueDays = isPresent(input.enigmaDays) ? input.enigmaDays : null;

  if (adoption == null) {
    return emptyRollup(timeToValueDays);
  }

  const results = input.lines
    .map((line) => calculateLine(line, adoption))
    .filter((line): line is LineResult => line !== null);

  if (results.length === 0) {
    return emptyRollup(timeToValueDays);
  }

  const impacted = results.reduce((sum, line) => sum + line.impacted, 0);
  const consumptionKnown = results.every((line) => line.consumption != null);
  const consumption = consumptionKnown
    ? results.reduce((sum, line) => sum + (line.consumption as number), 0)
    : null;
  const value = results.reduce((sum, line) => sum + line.value, 0);
  const implementationReady = input.lines
    .filter(isLineComplete)
    .every((line) => isPresent(line.implementationCost));
  const implementation =
    input.implementationCost !== undefined
      ? input.implementationCost
      : implementationReady
        ? results.reduce((sum, line) => sum + line.implementation, 0)
        : null;
  const netAnnual = consumption == null ? value : value - consumption;
  const daysAccelerated =
    isPresent(input.baselineDays) &&
    isPresent(input.enigmaDays) &&
    input.baselineDays > input.enigmaDays
      ? input.baselineDays - input.enigmaDays
      : null;

  return {
    complete: true,
    impacted,
    consumption,
    value,
    implementation,
    operating: consumption,
    year1:
      implementation == null || consumption == null
        ? null
        : implementation + consumption,
    threeYearCost:
      implementation == null || consumption == null
        ? null
        : implementation + 3 * consumption,
    netAnnual,
    roi:
      implementation == null || implementation === 0
        ? null
        : netAnnual / implementation,
    paybackMonths:
      implementation == null || netAnnual <= 0
        ? null
        : implementation / (netAnnual / 12),
    roc:
      consumption == null || consumption === 0 ? null : value / consumption,
    roa:
      daysAccelerated == null
        ? null
        : (value / 12) * (daysAccelerated / 30),
    timeToValueDays,
  };
}

export function caseGaps(input: {
  lines: LineAssumptions[];
  adoption: number | null;
  baselineDays: number | null;
  enigmaDays: number | null;
  implementationCost?: number | null;
}) {
  const gaps: string[] = [];

  if (!input.lines.some(isLineComplete)) {
    gaps.push(
      "Work per year, time on one today, and hourly labor cost are required on at least one opportunity.",
    );
  }

  if (!isPresent(input.adoption)) {
    gaps.push("Adoption rate for the selected scenario is not set.");
  }

  const missingImplementation =
    input.implementationCost !== undefined
      ? !isPresent(input.implementationCost)
      : input.lines.some(
          (line) => isLineComplete(line) && !isPresent(line.implementationCost),
        );
  if (missingImplementation) {
    gaps.push(
      input.implementationCost !== undefined
        ? "Project investment is not provided."
        : "Implementation cost is not provided on a complete opportunity.",
    );
  }

  if (!isPresent(input.baselineDays)) {
    gaps.push("Baseline time to deployment is not provided.");
  }

  if (!isPresent(input.enigmaDays)) {
    gaps.push("Enigma-assisted time to deployment is not provided.");
  }

  return gaps;
}

export function fallbackRecommendation(input: {
  rollup: CaseRollup;
  gaps: string[];
  hasWeakSignals: boolean;
  confidence: "high" | "medium" | "low" | null;
}): RecommendationState {
  if (!input.rollup.complete) {
    return "do_not_proceed";
  }

  if (input.confidence === "low" || input.gaps.length > 2) {
    return "validate";
  }

  const roc = input.rollup.roc;
  const net = input.rollup.netAnnual ?? 0;
  const hasConsumption =
    input.rollup.consumption != null && input.rollup.consumption > 0;
  if (net <= 0 || (hasConsumption && (roc == null || roc < 1))) {
    return "defer";
  }

  if (
    input.hasWeakSignals ||
    input.gaps.length > 0 ||
    input.rollup.implementation == null ||
    input.rollup.implementation === 0 ||
    (hasConsumption && roc != null && roc < 2)
  ) {
    return "proceed_with_conditions";
  }

  return "proceed";
}

export function adoptionForScenario(
  scenario: Scenario,
  rates: Record<Scenario, number | null>,
) {
  return rates[scenario];
}

export function normalizeAdoption(rates: Record<Scenario, number | null>) {
  const values = [
    rates.conservative ?? defaultAdoption.conservative,
    rates.expected ?? defaultAdoption.expected,
    rates.aggressive ?? defaultAdoption.aggressive,
  ].sort((left, right) => left - right);

  return {
    conservative: values[0],
    expected: values[1],
    aggressive: values[2],
  };
}

export type BusinessCaseDraft = {
  scenario: Scenario;
  conservativeAdoption: number | null;
  expectedAdoption: number | null;
  aggressiveAdoption: number | null;
  baselineDays: number | null;
  enigmaDays: number | null;
  lines: Array<{ opportunityId: string } & LineAssumptions>;
};

export function summarizeCase(input: {
  lines: LineAssumptions[];
  scenario: Scenario;
  conservativeAdoption: number | null;
  expectedAdoption: number | null;
  aggressiveAdoption: number | null;
  baselineDays: number | null;
  enigmaDays: number | null;
  implementationCost?: number | null;
  hasWeakSignals: boolean;
  confidence: "high" | "medium" | "low" | null;
}) {
  const adoption = adoptionForScenario(input.scenario, {
    conservative: input.conservativeAdoption ?? defaultAdoption.conservative,
    expected: input.expectedAdoption ?? defaultAdoption.expected,
    aggressive: input.aggressiveAdoption ?? defaultAdoption.aggressive,
  });
  const rollup = rollUpCase({
    lines: input.lines,
    adoption,
    baselineDays: input.baselineDays,
    enigmaDays: input.enigmaDays,
    implementationCost: input.implementationCost,
  });
  const gaps = caseGaps({
    lines: input.lines,
    adoption,
    baselineDays: input.baselineDays,
    enigmaDays: input.enigmaDays,
    implementationCost: input.implementationCost,
  });

  return {
    rollup,
    gaps,
    recommendationState: fallbackRecommendation({
      rollup,
      gaps,
      hasWeakSignals: input.hasWeakSignals,
      confidence: input.confidence,
    }),
  };
}

export function isPresent(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value >= 0;
}

export type ProjectInvestment = {
  discovery: number | null;
  implementation: number | null;
  knowledge: number | null;
  change: number | null;
  services: number | null;
  other: number | null;
};

export function sumProjectInvestment(input: ProjectInvestment) {
  const values = [
    input.discovery,
    input.implementation,
    input.knowledge,
    input.change,
    input.services,
    input.other,
  ];
  if (values.every((value) => value == null)) {
    return null;
  }

  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

