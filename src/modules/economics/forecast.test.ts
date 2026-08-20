import { describe, expect, it } from "vitest";
import {
  baselineFromSnapshot,
  buildDeploymentForecast,
  formatForecastBrief,
  toBaseline,
} from "@/modules/economics/forecast";

const foundryLine = {
  annualVolume: 25000,
  unitPrice: 1.25,
  hoursSavedPerUnit: 2,
  hourlyCost: 110,
  implementationCost: 0,
};

const opportunity = {
  name: "Service agent",
  key: "case_service_agent",
  finding: "Work, path, and grounding support a service agent.",
  area: "Service",
  process: "Service work handling",
  capability: "Service agent",
  confidence: "high",
  constraints: ["Write-back controls must stay narrow"],
  dependencies: ["A durable service work object"],
};

describe("deployment forecast", () => {
  it("uses the same value and consumption arithmetic as the business case", () => {
    const forecast = buildDeploymentForecast({
      caseStatus: "saved",
      selectedScenario: "expected",
      conservativeAdoption: 0.1,
      expectedAdoption: 0.2,
      aggressiveAdoption: 0.35,
      lines: [foundryLine],
      opportunity,
      recommendationState: "proceed_with_conditions",
      gaps: [],
      hasWeakSignals: true,
      weakSignals: ["Write-back control"],
      environmentName: "Foundry360 Prod Org",
      org: null,
    });

    const expected = forecast.scenarios.expected;
    expect(expected.impactedWork).toBe(5000);
    expect(expected.annualValue).toBe(1_100_000);
    expect(expected.consumption).toBe(6250);
    expect(expected.netAnnual).toBe(1_093_750);
    expect(expected.roc).toBe(176);
    expect(forecast.scenarios.conservative.impactedWork).toBe(2500);
    expect(forecast.scenarios.aggressive.impactedWork).toBe(8750);
    expect(forecast.decision).toBe("favorable_with_conditions");
    expect(forecast.sensitivities[0]?.variable).toBe("Agent Share");
    expect(forecast.workItemCost).toBe(1.25);
  });

  it("leaves consumption and ROC blank when work item cost is missing", () => {
    const forecast = buildDeploymentForecast({
      caseStatus: "planning",
      selectedScenario: "expected",
      conservativeAdoption: 0.1,
      expectedAdoption: 0.2,
      aggressiveAdoption: 0.25,
      lines: [{ ...foundryLine, unitPrice: null }],
      opportunity,
      recommendationState: "proceed",
      gaps: [],
      hasWeakSignals: false,
      weakSignals: [],
      environmentName: null,
      org: null,
    });

    expect(forecast.scenarios.expected.consumption).toBeNull();
    expect(forecast.scenarios.expected.roc).toBeNull();
    expect(forecast.scenarios.expected.annualValue).toBe(1_100_000);
    expect(forecast.sensitivities.some((item) => /blank/i.test(item.effect))).toBe(
      true,
    );
  });

  it("does not invent dependencies and stores a baseline from the selected scenario", () => {
    const forecast = buildDeploymentForecast({
      caseStatus: "approved",
      selectedScenario: "expected",
      conservativeAdoption: 0.1,
      expectedAdoption: 0.2,
      aggressiveAdoption: 0.35,
      lines: [foundryLine],
      opportunity,
      recommendationState: "proceed",
      gaps: [],
      hasWeakSignals: false,
      weakSignals: [],
      environmentName: "Foundry360 Prod Org",
      org: null,
    });

    expect(forecast.dependencies.map((item) => item.title)).toEqual([
      "A durable service work object",
    ]);
    expect(forecast.baseline).toEqual(toBaseline(forecast.scenarios.expected));
    expect(forecast.baseline?.annualValue).toBe(1_100_000);
    expect(formatForecastBrief(forecast)).toMatch(/Work Item Cost is a customer assumption/);
    expect(formatForecastBrief(forecast)).not.toMatch(/official Salesforce price is/);
  });

  it("reads a stored forecast baseline from the approved snapshot", () => {
    const baseline = baselineFromSnapshot({
      forecastBaseline: {
        scenario: "expected",
        workPerYear: 25000,
        agentShare: 0.2,
        impactedWork: 5000,
        workItemCost: 1.25,
        hoursOnItem: 2,
        laborCost: 110,
        consumption: 6250,
        annualValue: 1_100_000,
        netAnnual: 1_093_750,
        roc: 176,
      },
    });

    expect(baseline?.roc).toBe(176);
    expect(baselineFromSnapshot(null)).toBeNull();
  });
});
