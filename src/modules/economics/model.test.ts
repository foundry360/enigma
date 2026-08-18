import { describe, expect, it } from "vitest";
import {
  calculateLine,
  isLineComplete,
  isScenario,
  rollUpCase,
  scenarioMultiplier,
} from "@/modules/economics/model";

const completeLine = {
  annualVolume: 1000,
  unitPrice: 2,
  hoursSavedPerUnit: 0.25,
  hourlyCost: 80,
  implementationCost: 15000,
};

describe("business case arithmetic", () => {
  it("keeps scenario multipliers deterministic", () => {
    expect(scenarioMultiplier.conservative).toBe(0.7);
    expect(scenarioMultiplier.expected).toBe(1);
    expect(scenarioMultiplier.aggressive).toBe(1.3);
    expect(isScenario("expected")).toBe(true);
    expect(isScenario("pilot")).toBe(false);
  });

  it("treats a line as incomplete until volume, price, hours, and rate exist", () => {
    expect(isLineComplete(completeLine)).toBe(true);
    expect(
      isLineComplete({ ...completeLine, unitPrice: null }),
    ).toBe(false);
    expect(calculateLine({ ...completeLine, hourlyCost: null }, "expected")).toBe(
      null,
    );
  });

  it("scales volume-driven results and leaves implementation unscaled", () => {
    expect(calculateLine(completeLine, "expected")).toEqual({
      consumption: 2000,
      value: 20000,
      implementation: 15000,
    });
    expect(calculateLine(completeLine, "conservative")).toEqual({
      consumption: 1400,
      value: 14000,
      implementation: 15000,
    });
    expect(calculateLine(completeLine, "aggressive")).toEqual({
      consumption: 2600,
      value: 26000,
      implementation: 15000,
    });
  });

  it("rolls up complete lines and hides totals until one line is complete", () => {
    const empty = rollUpCase({
      lines: [{ ...completeLine, annualVolume: null }],
      scenario: "expected",
      monthsAccelerated: 3,
    });
    expect(empty.complete).toBe(false);
    expect(empty.consumption).toBeNull();
    expect(empty.roc).toBeNull();
    expect(empty.roa).toBeNull();

    const rolled = rollUpCase({
      lines: [completeLine, { ...completeLine, implementationCost: null }],
      scenario: "expected",
      monthsAccelerated: 3,
    });
    expect(rolled.complete).toBe(true);
    expect(rolled.consumption).toBe(4000);
    expect(rolled.value).toBe(40000);
    expect(rolled.implementation).toBe(15000);
    expect(rolled.roc).toBe(10);
    expect(rolled.roa).toBe(10000);
  });

  it("returns null ROC and ROA when the denominators are zero", () => {
    const zeroConsumption = rollUpCase({
      lines: [{ ...completeLine, unitPrice: 0 }],
      scenario: "expected",
      monthsAccelerated: 6,
    });
    expect(zeroConsumption.roc).toBeNull();
    expect(zeroConsumption.roa).toBe(10000);

    const noAcceleration = rollUpCase({
      lines: [completeLine],
      scenario: "expected",
      monthsAccelerated: 0,
    });
    expect(noAcceleration.roa).toBeNull();
  });

  it("does not embed official prices", () => {
    expect(JSON.stringify(scenarioMultiplier)).not.toMatch(/\$\d/);
    expect(JSON.stringify(completeLine).toLowerCase()).not.toContain(
      "list price",
    );
  });
});
