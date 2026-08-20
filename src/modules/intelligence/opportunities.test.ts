import { describe, expect, it } from "vitest";
import {
  detectOpportunityCandidates,
  hydrateCandidateDrafts,
} from "@/modules/intelligence/opportunities";
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
  process: null,
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

    expect(serviceOnly.map((item) => item.key)).toEqual([]);
  });

  it("names the opportunity from the durable work object, not a catalog", () => {
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

    expect(candidates.map((item) => item.key)).toEqual(["work:Case"]);
    expect(candidates[0]?.title).toBe("Case agent");
    expect(JSON.stringify(candidates)).not.toMatch(/\$\d/);
    expect(candidates[0]?.reason).toMatch(/Operating path[\s\S]*mixed/i);
    expect(candidates[0]?.reason).not.toMatch(/Operating path is strong/i);
  });

  it("names a custom work object as the opportunity", () => {
    const candidates = detectOpportunityCandidates(
      normalizeSignals({
        ...emptyFacts,
        objects: [
          { apiName: "Case", label: "Case", custom: false, queryable: true },
          {
            apiName: "Sales_Forecast__c",
            label: "Sales Forecast",
            custom: true,
            queryable: true,
          },
        ],
        describes: {
          Sales_Forecast__c: {
            apiName: "Sales_Forecast__c",
            label: "Sales Forecast",
            custom: true,
            fields: [
              {
                apiName: "Name",
                label: "Sales Forecast Name",
                type: "string",
                required: true,
                custom: false,
              },
              {
                apiName: "Forecast_Owner__c",
                label: "Forecast Owner",
                type: "reference",
                required: true,
                custom: true,
              },
            ],
            recordTypes: [],
          },
        },
      }),
    );

    expect(candidates[0]?.key).toBe("work:Sales_Forecast__c");
    expect(candidates[0]?.title).toBe("Sales Forecast agent");
    expect(candidates.map((item) => item.title)).not.toContain("Service agent");
  });

  it("hydrates a work opportunity from stored judgments", () => {
    const facts = normalizeSignals({
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
    });
    const drafts = hydrateCandidateDrafts([
      ...facts.signals.map((signal) => ({
        kind: "dimension",
        key: signal.key,
        title: signal.title,
        score: signal.score,
        evidence: signal.evidence,
        reason: signal.meaning,
        risk: signal.risk,
        recommendation: signal.recommendation,
      })),
      ...detectOpportunityCandidates(facts),
    ]);

    expect(drafts[0]?.constraints.length).toBeGreaterThan(0);
    expect(drafts[0]?.confidence).toMatch(/high|medium|low/);
    expect(JSON.stringify(drafts)).not.toMatch(/\$\d/);
  });
});
