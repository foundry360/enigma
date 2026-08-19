import { describe, expect, it } from "vitest";
import {
  calculateLine,
  caseGaps,
  defaultAdoption,
  emptyRollup,
  fallbackRecommendation,
  isLineComplete,
  isScenario,
  rollUpCase,
  normalizeAdoption,
  sumProjectInvestment,
  summarizeCase,
} from "@/modules/economics/model";

const completeLine = {
  annualVolume: 1000,
  unitPrice: 2,
  hoursSavedPerUnit: 0.25,
  hourlyCost: 80,
  implementationCost: 15000,
};

describe("business case arithmetic", () => {
  it("uses adoption rates, not hidden price multipliers", () => {
    expect(defaultAdoption.conservative).toBe(0.1);
    expect(defaultAdoption.expected).toBe(0.15);
    expect(defaultAdoption.aggressive).toBe(0.25);
    expect(isScenario("expected")).toBe(true);
    expect(JSON.stringify(defaultAdoption)).not.toMatch(/\$\d/);
  });

  it("treats a line as incomplete until volume, price, hours, and rate exist", () => {
    expect(isLineComplete(completeLine)).toBe(true);
    expect(isLineComplete({ ...completeLine, unitPrice: null })).toBe(false);
    expect(calculateLine({ ...completeLine, hourlyCost: null }, 0.15)).toBe(
      null,
    );
  });

  it("applies adoption to volume and leaves implementation unscaled", () => {
    expect(calculateLine(completeLine, 0.15)).toEqual({
      impacted: 150,
      consumption: 300,
      value: 3000,
      implementation: 15000,
    });
    expect(calculateLine(completeLine, 0.1)?.consumption).toBe(200);
    expect(calculateLine(completeLine, 0.25)?.value).toBe(5000);
  });

  it("rolls up complete lines and hides totals until one line is complete", () => {
    const empty = rollUpCase({
      lines: [{ ...completeLine, annualVolume: null }],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
    });
    expect(empty).toMatchObject(emptyRollup(60));

    const rolled = rollUpCase({
      lines: [completeLine, { ...completeLine, implementationCost: null }],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
    });
    expect(rolled.complete).toBe(true);
    expect(rolled.consumption).toBe(600);
    expect(rolled.value).toBe(6000);
    expect(rolled.implementation).toBeNull();
    expect(rolled.netAnnual).toBe(5400);
    expect(rolled.roi).toBeNull();
    expect(rolled.paybackMonths).toBeNull();
    expect(rolled.roc).toBe(10);
    expect(rolled.roa).toBe((6000 / 12) * (120 / 30));
    expect(rolled.timeToValueDays).toBe(60);
  });

  it("returns null ROI, payback, ROC, and ROA when the math is not honest", () => {
    const zeroConsumption = rollUpCase({
      lines: [{ ...completeLine, unitPrice: 0 }],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
    });
    expect(zeroConsumption.roc).toBeNull();
    expect(zeroConsumption.netAnnual).toBe(3000);
    expect(zeroConsumption.roa).toBe((3000 / 12) * 4);

    const noInvestment = rollUpCase({
      lines: [{ ...completeLine, implementationCost: 0 }],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
    });
    expect(noInvestment.roi).toBeNull();

    const noAcceleration = rollUpCase({
      lines: [completeLine],
      adoption: 0.15,
      baselineDays: 60,
      enigmaDays: 60,
    });
    expect(noAcceleration.roa).toBeNull();
  });

  it("lists gaps instead of inventing inputs", () => {
    expect(
      caseGaps({
        lines: [{ ...completeLine, annualVolume: null }],
        adoption: null,
        baselineDays: null,
        enigmaDays: null,
      }).length,
    ).toBeGreaterThan(2);
  });

  it("keeps conservative adoption as the lowest share", () => {
    expect(
      normalizeAdoption({
        conservative: 0.2,
        expected: 0.15,
        aggressive: 0.3,
      }),
    ).toEqual({
      conservative: 0.15,
      expected: 0.2,
      aggressive: 0.3,
    });
  });

  it("sums entered project costs and does not invent a total", () => {
    expect(
      sumProjectInvestment({
        discovery: 5000,
        implementation: 18000,
        knowledge: 4000,
        change: 6000,
        services: 3000,
        other: null,
      }),
    ).toBe(36000);
    expect(
      sumProjectInvestment({
        discovery: null,
        implementation: null,
        knowledge: null,
        change: null,
        services: null,
        other: null,
      }),
    ).toBeNull();
  });

  it("uses entered project investment instead of inventing line splits", () => {
    const rolled = rollUpCase({
      lines: [completeLine, { ...completeLine, implementationCost: null }],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
      implementationCost: 36000,
    });
    expect(rolled.implementation).toBe(36000);
    expect(rolled.roi).toBe(5400 / 36000);
    expect(
      caseGaps({
        lines: [{ ...completeLine, implementationCost: null }],
        adoption: 0.15,
        baselineDays: 180,
        enigmaDays: 60,
        implementationCost: null,
      }),
    ).toContain("Project investment is not provided.");
  });

  it("summarizes a live draft without inventing missing totals", () => {
    const incomplete = summarizeCase({
      lines: [{ ...completeLine, annualVolume: null }],
      scenario: "expected",
      conservativeAdoption: 0.1,
      expectedAdoption: 0.15,
      aggressiveAdoption: 0.25,
      baselineDays: null,
      enigmaDays: null,
      hasWeakSignals: false,
      confidence: "high",
    });
    expect(incomplete.rollup.complete).toBe(false);
    expect(incomplete.rollup.consumption).toBeNull();
    expect(incomplete.recommendationState).toBe("do_not_proceed");
    expect(incomplete.gaps.length).toBeGreaterThan(0);
  });

  it("derives a fallback recommendation from the model, not a score", () => {
    const complete = rollUpCase({
      lines: [completeLine],
      adoption: 0.15,
      baselineDays: 180,
      enigmaDays: 60,
    });
    expect(
      fallbackRecommendation({
        rollup: complete,
        gaps: [],
        hasWeakSignals: false,
        confidence: "high",
      }),
    ).toBe("proceed");
    expect(
      fallbackRecommendation({
        rollup: emptyRollup(),
        gaps: ["missing volume"],
        hasWeakSignals: false,
        confidence: null,
      }),
    ).toBe("do_not_proceed");
  });
});
