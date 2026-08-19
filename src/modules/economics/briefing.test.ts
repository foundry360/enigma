import { describe, expect, it } from "vitest";
import {
  briefingToPrompt,
  fallbackNarratives,
  toBusinessCaseBriefing,
} from "@/modules/economics/briefing";
import { emptyRollup } from "@/modules/economics/model";

const briefing = {
  opportunities: [
    {
      name: "Service agent",
      process: "Service work handling",
      capability: "Service agent",
      confidence: "high",
      finding: "Work, path, and grounding are present.",
      signals: [{ title: "Addressable work", strength: "strong" }],
      evidence: ["Work objects: Case."],
      consumptionDrivers: ["Customer conversations the agent would answer"],
      valueDrivers: ["Less time spent handling each service request"],
      constraints: ["Write-back controls must stay narrow"],
      dependencies: ["A durable service work object"],
    },
  ],
  assumptions: [
    { label: "Annual volume", value: "1000", source: "Enigma Assumption" },
    { label: "Unit price", value: "2", source: "Enigma Assumption" },
  ],
  rollup: {
    ...emptyRollup(),
    complete: true,
    consumption: 300,
    value: 3000,
    netAnnual: 2700,
    roi: 0.18,
    roc: 10,
  },
  gaps: [],
  recommendationState: "proceed" as const,
};

describe("business case briefing", () => {
  it("records missing customer numbers as insufficient data", () => {
    const built = toBusinessCaseBriefing({
      opportunities: [
        {
          name: "Service agent",
          process: "Service work handling",
          capability: "Service agent",
          confidence: "high",
          finding: "Work is present.",
          signals: [{ title: "Addressable work", strength: "strong" }],
          evidence: ["Work objects: Case."],
          consumptionDrivers: ["Conversations"],
          valueDrivers: ["Handle time"],
          constraints: ["Write-back"],
          dependencies: ["Case"],
          annualVolume: null,
          unitPrice: null,
        },
      ],
      scenario: "expected",
      adoption: 0.15,
      rollup: emptyRollup(),
      gaps: ["Volume is required."],
      recommendationState: "do_not_proceed",
    });
    expect(built.assumptions.some((item) => item.value === "Insufficient data")).toBe(
      true,
    );
  });

  it("grounds the prompt in inherited evidence and calculated totals", () => {
    const prompt = briefingToPrompt(briefing);
    expect(prompt).toContain("Addressable work");
    expect(prompt).toContain("Work objects: Case.");
    expect(prompt).toContain("Consumption 300");
    expect(prompt.toLowerCase()).not.toContain("list price");
  });

  it("falls back to explainable copy when no model is configured", () => {
    const copy = fallbackNarratives({
      ...briefing,
      rollup: emptyRollup(),
      recommendationState: "do_not_proceed",
    });
    expect(copy.recommendationNarrative).toMatch(/Do Not Proceed/);
    expect(copy.intelligenceNarrative).toContain("Addressable work");
  });
});
