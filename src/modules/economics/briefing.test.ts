import { describe, expect, it } from "vitest";
import {
  briefingToPrompt,
  decipherRecommendation,
  fallbackNarratives,
  parseNarratives,
  splitCitedCopy,
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
      annualVolume: 1000,
      unitPrice: 2,
      hoursSavedPerUnit: 0.25,
      hourlyCost: 80,
    },
  ],
  assumptions: [
    { label: "Annual volume", value: "1000", source: "Customer Provided" },
    { label: "Unit price", value: "2", source: "Customer Provided" },
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
  calculations: ["Consumption 300. Value 3000."],
  recommendationWhy: "Proceed because the case is complete.",
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
    expect(prompt).toContain("Case is the durable work record");
    expect(prompt).toContain("Consumption 300");
    expect(prompt.toLowerCase()).not.toContain("list price");
  });

  it("tells the model to name every promoted opportunity", () => {
    const prompt = briefingToPrompt({
      ...briefing,
      opportunities: [
        briefing.opportunities[0],
        {
          ...briefing.opportunities[0],
          name: "Credentialing agent",
          process: "Credentialing",
          capability: "Credentialing agent",
        },
        {
          ...briefing.opportunities[0],
          name: "License agent",
          process: "Licensing",
          capability: "License agent",
        },
      ],
    });
    expect(prompt).toContain("Cover every promoted opportunity by name");
    expect(prompt).toContain("Credentialing agent");
    expect(prompt).toContain("License agent");
  });

  it("counts shared work per year once in the briefing", () => {
    const built = toBusinessCaseBriefing({
      opportunities: [
        briefing.opportunities[0],
        { ...briefing.opportunities[0], name: "Order agent" },
      ],
      scenario: "expected",
      adoption: 0.15,
      rollup: briefing.rollup,
      gaps: [],
      recommendationState: "proceed",
    });
    const volumes = built.assumptions.filter((item) =>
      /work per year/i.test(item.label),
    );
    expect(volumes).toEqual([
      {
        label: "Work per year",
        value: "1000",
        source: "Customer Provided",
      },
    ]);
    expect(built.calculations.join(" ")).toContain("counted once");
    expect(built.calculations.join(" ")).not.toContain(
      "On Order agent, Impacted",
    );
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

  it("deciphers a conditional recommendation from the weak signals", () => {
    const built = toBusinessCaseBriefing({
      opportunities: [
        {
          name: "Service agent",
          process: "Service work handling",
          capability: "Service agent",
          confidence: "high",
          finding: "Work, path, and grounding are present.",
          signals: [
            { key: "addressable_work", title: "Addressable work", strength: "strong" },
            { key: "writeback_control", title: "Write-back control", strength: "weak" },
            { key: "access_surface", title: "Access surface", strength: "weak" },
          ],
          evidence: [
            "Addressable work: Work objects: Case.",
            "Write-back control: Case has 0 required fields.",
            "Access surface: 12 permission sets and 4 profiles.",
          ],
          consumptionDrivers: ["Conversations"],
          valueDrivers: ["Handle time"],
          constraints: ["Write-back controls must stay narrow"],
          dependencies: ["Case"],
          annualVolume: 1000,
          unitPrice: 2,
          hoursSavedPerUnit: 0.25,
          hourlyCost: 80,
        },
      ],
      scenario: "expected",
      adoption: 0.15,
      implementation: 15000,
      rollup: {
        ...emptyRollup(),
        complete: true,
        consumption: 300,
        value: 3000,
        netAnnual: 2700,
        roc: 176,
      },
      gaps: [],
      recommendationState: "proceed_with_conditions",
      hasWeakSignals: true,
      weakSignals: ["Write-back control", "Access surface"],
      confidence: "high",
    });

    const copy = decipherRecommendation(built);
    expect(copy).toContain("\n\n");
    expect(copy).toMatch(/The numbers support moving forward/i);
    expect(copy).toMatch(/Write-back control is still weak/i);
    expect(copy).toMatch(/Access control is still weak/i);
    expect(copy).toMatch(/dedicated permission set/i);
    expect(copy).toMatch(/lock the rest/i);
    expect(copy).toMatch(/ROC is 176/i);
    expect(copy).toContain("$2,700");
    expect(copy).toContain("⟦Work objects: Case⟧");
    expect(copy).toContain("⟦Case has 0 required fields⟧");
    expect(copy).toContain("⟦12 permission sets and 4 profiles⟧");
    expect(copy).not.toContain("⟦176⟧");
    expect(copy.split("\n\n").every((paragraph) => /[.!?]$/.test(paragraph))).toBe(
      true,
    );
  });

  it("reads labeled recommendation and intelligence prose", () => {
    const parsed = parseNarratives(
      "Recommendation: Proceed with Conditions because write-back is weak.\n\nIntelligence: Addressable work is strong and Case is present.",
    );
    expect(parsed?.recommendation).toMatch(/write-back is weak/i);
    expect(parsed?.intelligence).toMatch(/Addressable work/i);
  });

  it("splits recommendation citations without treating ROC as a source", () => {
    const parts = splitCitedCopy(
      "ROC is 176. Service agent is a high-confidence opportunity. Work, path, and grounding are present. Addressable work is strong. ⟦Work objects: Case⟧.",
    );
    expect(parts.filter((part) => part.cited).map((part) => part.text)).toEqual([
      "Work objects: Case",
    ]);
    expect(parts.some((part) => !part.cited && part.text.includes("ROC is 176"))).toBe(
      true,
    );
  });
});
