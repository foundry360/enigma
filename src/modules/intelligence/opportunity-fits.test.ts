import { describe, expect, it } from "vitest";
import {
  groundOpportunityFits,
  parseOpportunityFits,
  resolveOpportunityFits,
} from "@/modules/intelligence/opportunity-fits";
import { detectOpportunityCandidates } from "@/modules/intelligence/opportunities";
import { normalizeSignals } from "@/modules/intelligence/signals";
import type { AssessmentFacts } from "@/modules/intelligence/types";

const pool = [
  {
    apiName: "Sales_Forecast__c",
    label: "Sales Forecast",
    custom: true,
    fieldCount: 5,
    customFieldCount: 1,
    hasLifecycle: false,
    usedInModel: true,
    role: "primary" as const,
    score: 80,
  },
  {
    apiName: "Case",
    label: "Case",
    custom: false,
    fieldCount: 40,
    customFieldCount: 0,
    hasLifecycle: true,
    usedInModel: true,
    role: "secondary" as const,
    score: 40,
  },
];

describe("opportunity fits", () => {
  it("accepts ranked fits from the pool and drops invented objects", () => {
    const fits = parseOpportunityFits(
      JSON.stringify({
        fits: [
          {
            apiName: "Sales_Forecast__c",
            selected: true,
            rank: 1,
            reason: "This project is about forecast work.",
            risk: "Thin fields.",
            recommendation: "Pilot one forecast topic.",
          },
          {
            apiName: "Made_Up__c",
            selected: true,
            rank: 2,
            reason: "Invented",
            risk: "",
            recommendation: "",
          },
          {
            apiName: "Case",
            selected: false,
            rank: 3,
            reason: "Licensed Case is not the work.",
            risk: "",
            recommendation: "",
          },
        ],
      }),
      pool,
    );

    expect(fits.map((item) => item.apiName)).toEqual([
      "Sales_Forecast__c",
      "Case",
    ]);
    expect(fits[0]?.selected).toBe(true);
    expect(fits[1]?.selected).toBe(false);
  });

  it("falls back to metadata rank when the model selects nothing", () => {
    const fits = resolveOpportunityFits('{"fits":[]}', pool);
    expect(fits.map((item) => item.apiName)).toEqual([
      "Sales_Forecast__c",
      "Case",
    ]);
    expect(fits.every((item) => item.selected)).toBe(true);
    expect(fits[0]?.reason).toMatch(/model pass was not available/);
  });

  it("emits only the selected fits as opportunities", () => {
    const facts: AssessmentFacts = {
      projectType: "AI Opportunity Assessment",
      objective: "Improve sales forecast submission",
      outcomes: ["Faster forecast cycles"],
      connection: null,
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
        Case: {
          apiName: "Case",
          label: "Case",
          custom: false,
          fields: [
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
          ],
          recordTypes: [
            { developerName: "Support", label: "Support", active: true },
          ],
        },
        Sales_Forecast__c: {
          apiName: "Sales_Forecast__c",
          label: "Sales Forecast",
          custom: true,
          fields: [
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
      automations: [],
      validationRules: [],
      process: null,
      security: null,
      knowledge: null,
      limits: null,
    };

    const all = detectOpportunityCandidates(normalizeSignals(facts));
    expect(all.map((item) => item.key)).toEqual(
      expect.arrayContaining(["work:Sales_Forecast__c", "work:Case"]),
    );

    const selected = detectOpportunityCandidates(normalizeSignals(facts), [
      {
        apiName: "Sales_Forecast__c",
        label: "Sales Forecast",
        selected: true,
        rank: 1,
        reason: "Forecast is the work this project asked about.",
        risk: "Thin object.",
        recommendation: "Start on Sales Forecast.",
      },
      {
        apiName: "Case",
        label: "Case",
        selected: false,
        rank: 2,
        reason: "Not the project work.",
        risk: "",
        recommendation: "",
      },
    ]);

    expect(selected.map((item) => item.key)).toEqual(["work:Sales_Forecast__c"]);
    expect(selected[0]?.reason).toMatch(/Forecast is the work/);
  });

  it("grounds fits to existing findings and signals and drops invented ids", () => {
    const model = {
      version: 1 as const,
      findings: [
        {
          id: "work-primary",
          domain: "workload" as const,
          title: "Sales Forecast is the primary durable work object",
          summary: "Forecast is durable work.",
          evidence: [],
          confidence: "high" as const,
          provenance: "inferred" as const,
          businessImplication: "An agent can sit on forecast work.",
          nextAction: "Validate the path.",
          relatedSignals: ["addressable_work" as const],
        },
      ],
      gaps: [],
      workload: {
        primary: [
          {
            apiName: "Sales_Forecast__c",
            label: "Sales Forecast",
            kind: "service" as const,
            role: "primary" as const,
            volume: { value: null, basis: "unknown" as const },
          },
        ],
        secondary: [],
        context: [],
        volumeAvailable: false,
        volumeGap: null,
      },
    };
    const fits = groundOpportunityFits(
      parseOpportunityFits(
        JSON.stringify({
          fits: [
            {
              apiName: "Sales_Forecast__c",
              selected: true,
              rank: 1,
              reason: "Forecast matches the objective.",
              risk: "Thin fields.",
              recommendation: "Pilot one topic.",
              supportingFindingIds: ["work-primary", "invented-finding"],
              supportingSignalIds: ["addressable_work", "made_up_signal"],
              confidence: "high",
            },
          ],
        }),
        pool,
      ),
      model as never,
      [
        {
          key: "addressable_work",
          title: "Addressable work",
          score: 80,
          strength: "strong",
          evidence: [],
          meaning: "Forecast is durable work.",
          consumption: "Volume can attach to existing work.",
          risk: "Quality unknown.",
          recommendation: "Validate fields.",
        },
      ],
    );

    expect(fits[0]?.supportingFindingIds).toEqual(["work-primary"]);
    expect(fits[0]?.supportingSignalIds).toEqual(["addressable_work"]);
    expect(fits[0]?.confidence).toBe("high");
  });
});
