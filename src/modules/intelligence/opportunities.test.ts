import { describe, expect, it } from "vitest";
import { detectOpportunityCandidates } from "@/modules/intelligence/opportunities";
import { normalizeSignals } from "@/modules/intelligence/signals";
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

describe("opportunity candidates", () => {
  it("requires signal combinations, not raw object presence", () => {
    const serviceOnly = detectOpportunityCandidates(
      normalizeSignals({
        ...emptyFacts,
        objects: [
          { apiName: "Case", label: "Case", custom: false, queryable: true },
        ],
      }),
    );

    expect(serviceOnly.map((item) => item.key)).not.toContain(
      "case_service_agent",
    );
    expect(serviceOnly.map((item) => item.key)).not.toContain("knowledge_assist");
  });

  it("emits service agent when work, path, and grounding are present", () => {
    const candidates = detectOpportunityCandidates(
      normalizeSignals({
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
            fields: Array.from({ length: 24 }, (_, index) => ({
              apiName: `Field${index}`,
              label: `Field ${index}`,
              type: "string",
              required: false,
              custom: false,
            })),
            recordTypes: [],
          },
        },
        knowledge: {
          enabled: true,
          articleObjects: ["Knowledge__kav"],
          dataCategories: [],
        },
        security: { profileCount: 8, permissionSetCount: 4 },
        validationRules: [
          { name: "Require_Origin", objectApiName: "Case", active: true },
        ],
      }),
    );

    expect(candidates.map((item) => item.key)).toEqual([
      "case_service_agent",
      "knowledge_assist",
      "guided_case_flow",
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(/\$\d/);
  });
});
