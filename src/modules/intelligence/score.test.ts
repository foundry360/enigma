import { describe, expect, it } from "vitest";
import {
  overallFinding,
  overallScore,
  readinessRisk,
  scoreAssessment,
} from "@/modules/intelligence/score";
import type { AssessmentFacts } from "@/modules/intelligence/types";

const emptyFacts: AssessmentFacts = {
  projectType: "AI Opportunity Assessment",
  objective: "Find Agentforce value in service",
  outcomes: ["Improve customer experience"],
  connection: null,
  objects: [],
  describes: {},
  automations: [],
  validationRules: [],
  security: null,
  knowledge: null,
  limits: null,
};

describe("assessment scoring", () => {
  it("requires evidence on every judgment and stays deterministic", () => {
    const first = scoreAssessment({
      ...emptyFacts,
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
      ],
      describes: {
        Case: {
          apiName: "Case",
          label: "Case",
          custom: false,
          fields: Array.from({ length: 40 }, (_, index) => ({
            apiName: `Field${index}`,
            label: `Field ${index}`,
            type: "string",
            required: false,
            custom: false,
          })),
          recordTypes: [],
        },
      },
      automations: [
        { kind: "flow", name: "Case_Route", namespace: null, status: "Active", size: null },
      ],
      security: { profileCount: 12, permissionSetCount: 8 },
      knowledge: { enabled: false, articleObjects: [], dataCategories: [] },
    });

    expect(first.every((item) => item.evidence.length > 0)).toBe(true);
    expect(first.every((item) => item.reason && item.risk && item.recommendation)).toBe(
      true,
    );
    expect(first.some((item) => item.key === "case_service_agent")).toBe(true);
    expect(scoreAssessment(emptyFacts).map((item) => item.score)).not.toEqual(
      first.map((item) => item.score),
    );
    expect(overallScore(first)).toBeGreaterThan(0);
    expect(overallScore(first)).toBeLessThanOrEqual(100);
  });

  it("maps readiness to low, medium, or high risk", () => {
    expect(readinessRisk(90)).toBe("low");
    expect(readinessRisk(61)).toBe("medium");
    expect(readinessRisk(20)).toBe("high");
    expect(readinessRisk(null)).toBeNull();
  });

  it("writes an overall finding from dimension scores", () => {
    const finding = overallFinding({
      overallScore: 61,
      dimensions: [
        { title: "Data", score: 100 },
        { title: "Process", score: 100 },
        { title: "Knowledge", score: 80 },
        { title: "Automation", score: 15 },
        { title: "Security", score: 40 },
        { title: "Governance", score: 30 },
      ],
    });

    expect(finding).toContain("uneven");
    expect(finding).toContain("Data 100");
    expect(finding).toContain("Governance 30");
  });

  it("does not invent Salesforce prices", () => {
    const text = JSON.stringify(scoreAssessment(emptyFacts));
    expect(text).not.toMatch(/\$\d/);
    expect(text.toLowerCase()).not.toContain("list price");
  });
});
