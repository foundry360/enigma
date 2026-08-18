export const scenarios = ["conservative", "expected", "aggressive"] as const;

export type Scenario = (typeof scenarios)[number];

export const scenarioMultiplier: Record<Scenario, number> = {
  conservative: 0.7,
  expected: 1,
  aggressive: 1.3,
};

export function isScenario(value: string): value is Scenario {
  return scenarios.includes(value as Scenario);
}

export type LineAssumptions = {
  annualVolume: number | null;
  unitPrice: number | null;
  hoursSavedPerUnit: number | null;
  hourlyCost: number | null;
  implementationCost: number | null;
};

export type LineResult = {
  consumption: number;
  value: number;
  implementation: number;
};

export type CaseRollup = {
  complete: boolean;
  consumption: number | null;
  value: number | null;
  implementation: number | null;
  roc: number | null;
  roa: number | null;
};

export function isLineComplete(line: LineAssumptions) {
  return (
    isPresent(line.annualVolume) &&
    isPresent(line.unitPrice) &&
    isPresent(line.hoursSavedPerUnit) &&
    isPresent(line.hourlyCost)
  );
}

export function calculateLine(
  line: LineAssumptions,
  scenario: Scenario,
): LineResult | null {
  if (!isLineComplete(line)) {
    return null;
  }

  const multiplier = scenarioMultiplier[scenario];
  const volume = line.annualVolume as number;
  const unitPrice = line.unitPrice as number;
  const hoursSavedPerUnit = line.hoursSavedPerUnit as number;
  const hourlyCost = line.hourlyCost as number;

  return {
    consumption: volume * unitPrice * multiplier,
    value: volume * hoursSavedPerUnit * hourlyCost * multiplier,
    implementation: line.implementationCost ?? 0,
  };
}

export function rollUpCase(input: {
  lines: LineAssumptions[];
  scenario: Scenario;
  monthsAccelerated: number | null;
}): CaseRollup {
  const results = input.lines
    .map((line) => calculateLine(line, input.scenario))
    .filter((line): line is LineResult => line !== null);

  if (results.length === 0) {
    return {
      complete: false,
      consumption: null,
      value: null,
      implementation: null,
      roc: null,
      roa: null,
    };
  }

  const consumption = results.reduce((sum, line) => sum + line.consumption, 0);
  const value = results.reduce((sum, line) => sum + line.value, 0);
  const implementation = results.reduce(
    (sum, line) => sum + line.implementation,
    0,
  );

  return {
    complete: true,
    consumption,
    value,
    implementation,
    roc: consumption === 0 ? null : value / consumption,
    roa:
      !isPresent(input.monthsAccelerated) || input.monthsAccelerated === 0
        ? null
        : (value / 12) * input.monthsAccelerated,
  };
}

function isPresent(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value >= 0;
}
