import { describe, expect, it } from "vitest";
import {
  assumptionSource,
  proposeCaseTiming,
  proposeLineAssumptions,
} from "@/modules/economics/propose";

const strongSignals = [
  { key: "addressable_work", strength: "strong" as const },
  { key: "operating_path", strength: "strong" as const },
  { key: "grounded_answers", strength: "strong" as const },
  { key: "automation_collision", strength: "strong" as const },
  { key: "writeback_control", strength: "strong" as const },
];

describe("business case decipher", () => {
  it("proposes complete assumptions from intelligence and org size", () => {
    const line = proposeLineAssumptions({
      candidateKey: "case_service_agent",
      confidence: "high",
      signals: strongSignals,
      constraintCount: 3,
      employeeRange: "201–1,000",
    });

    expect(line.annualVolume).toBe(20000);
    expect(line.unitPrice).toBe(1.25);
    expect(line.hoursSavedPerUnit).toBe(0.25);
    expect(line.hourlyCost).toBe(85);
    expect(line.implementationCost).toBeNull();
    expect(line.reasons.implementationCost).toMatch(/does not invent/);
    expect(line.reasons.unitPrice).toMatch(/Not official Salesforce pricing/);
    expect(JSON.stringify(line.reasons).toLowerCase()).not.toContain("list price");
  });

  it("scales volume down when addressable work is mixed and the org is smaller", () => {
    const line = proposeLineAssumptions({
      candidateKey: "knowledge_assist",
      confidence: "medium",
      signals: [
        { key: "addressable_work", strength: "mixed" },
        { key: "operating_path", strength: "mixed" },
      ],
      constraintCount: 2,
      employeeRange: "1–50",
    });

    expect(line.annualVolume).toBeLessThan(2500);
    expect(line.unitPrice).toBe(0.45);
    expect(line.hoursSavedPerUnit).toBe(0.08);
  });

  it("deciphers adoption and days from confidence and risk, not a blank form", () => {
    const ready = proposeCaseTiming({
      confidence: "high",
      signals: strongSignals,
      constraintCount: 2,
    });
    expect(ready.expectedAdoption).toBe(0.18);
    expect(ready.enigmaDays).toBeLessThan(ready.baselineDays);

    const risky = proposeCaseTiming({
      confidence: "low",
      signals: [
        { key: "writeback_control", strength: "weak" },
        { key: "automation_collision", strength: "mixed" },
      ],
      constraintCount: 4,
    });
    expect(risky.expectedAdoption).toBe(0.1);
    expect(risky.baselineDays).toBeGreaterThan(ready.baselineDays);
  });

  it("labels entered numbers as customer provided and leaves blanks unlabeled", () => {
    expect(assumptionSource(12000)).toBe("Customer Provided");
    expect(assumptionSource(null)).toBeNull();
  });
});
