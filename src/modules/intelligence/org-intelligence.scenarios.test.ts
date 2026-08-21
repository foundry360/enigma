import { describe, expect, it } from "vitest";
import {
  attachOpportunityName,
  buildOrgIntelligence,
  stampOrgIntelligenceRun,
} from "@/modules/intelligence/org-intelligence";
import { normalizeSignals } from "@/modules/intelligence/signals";
import { factsFromResults } from "@/modules/intelligence/summarize";
import type { AssessmentFacts } from "@/modules/intelligence/types";
import { fallbackOpportunityFits, groundOpportunityFits } from "@/modules/intelligence/opportunity-fits";
import { durableWorkFromFacts } from "@/modules/intelligence/work-objects";

const base: AssessmentFacts = {
  projectType: "AI / Agent Deployment",
  objective: "Find service use cases",
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

function caseDescribe(extra?: {
  custom?: boolean;
  required?: boolean;
  status?: boolean;
}) {
  const fields = [
    ...(extra?.status === false
      ? []
      : [
          {
            apiName: "Status",
            label: "Status",
            type: "picklist",
            required: false,
            custom: false,
            picklistLabels: ["New", "Working", "Closed"],
          },
        ]),
    ...(extra?.custom
      ? [
          {
            apiName: "Reason__c",
            label: "Reason",
            type: "string",
            required: Boolean(extra.required),
            custom: true,
          },
        ]
      : []),
  ];
  return {
    apiName: "Case",
    label: "Case",
    custom: false,
    fields,
    recordTypes: extra?.custom
      ? [{ developerName: "Support", label: "Support", active: true }]
      : [{ developerName: "Master", label: "Master", active: true }],
  };
}

describe("org intelligence scenarios", () => {
  it("models strong Case metadata without inventing volume or quality", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true }) },
      knowledge: { enabled: true, articleObjects: ["Knowledge__kav"], dataCategories: ["FAQ"] },
      security: { profileCount: 8, permissionSetCount: 4 },
    });

    expect(model.workload.primary[0]?.apiName).toBe("Case");
    expect(model.findings.some((item) => item.id === "work-primary")).toBe(true);
    expect(model.findings.some((item) => item.id === "process-lifecycle")).toBe(true);
    expect(model.workload.primary[0]?.volume.status).toBe("unknown");
    expect(model.data.qualityAvailable).toBe(false);
    expect(JSON.stringify(model)).not.toMatch(/\d+%/);
  });

  it("does not treat catalog-only objects as durable work", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe() },
    });

    expect(model.workload.primary[0]).toBeUndefined();
    expect(model.findings.some((item) => item.id === "work-unused-standard")).toBe(
      true,
    );
    expect(model.findings.some((item) => item.id === "work-primary")).toBe(false);
  });

  it("keeps work without a lifecycle from becoming a complete process", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true, status: false }) },
    });

    expect(model.workload.primary[0]?.apiName).toBe("Case");
    expect(model.findings.some((item) => item.id === "process-lifecycle")).toBe(
      false,
    );
    expect(model.findings.some((item) => item.id === "process-missing")).toBe(true);
    expect(model.gaps?.some((item) => item.id === "gap-handoff")).toBe(true);
  });

  it("keeps unknown volume distinct from zero or estimated volume", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true }) },
    });

    expect(model.workload.volumeAvailable).toBe(false);
    expect(model.workload.primary[0]?.volume.value).toBeNull();
    expect(model.workload.primary[0]?.volume.status).toBe("unknown");
  });

  it("maps extensive automation onto the work object instead of a count-only finding", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true }) },
      automations: [
        {
          kind: "flow",
          name: "Case_Owner_Update",
          namespace: null,
          status: "Active",
          size: null,
          objectApiName: "Case",
          objectLabel: "Case",
          triggerType: "after save",
          actions: ["update owner"],
          fieldsAffected: ["OwnerId"],
        },
      ],
    });

    expect(model.automation.map[0]).toMatchObject({
      name: "Case_Owner_Update",
      objectApiName: "Case",
      trigger: "after save",
    });
    expect(model.findings.some((item) => item.id === "automation-present")).toBe(
      true,
    );
    expect(model.findings.find((item) => item.id === "automation-present")?.summary).toMatch(
      /Case/,
    );
  });

  it("treats observed empty automation as none, not as a failed tool", () => {
    const model = buildOrgIntelligence({
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true }) },
      automations: [],
      observed: { automations: true },
    });

    expect(model.findings.some((item) => item.id === "automation-thin")).toBe(true);
    expect(model.gaps?.some((item) => item.id === "gap-automation")).toBe(false);
  });

  it("does not equate a broad permission estate with weak security", () => {
    const broad = buildOrgIntelligence({
      ...base,
      security: { profileCount: 44, permissionSetCount: 179 },
    });
    const narrow = buildOrgIntelligence({
      ...base,
      security: { profileCount: 6, permissionSetCount: 4 },
    });

    expect(broad.access.isolation).toBe("sprawling");
    expect(narrow.access.isolation).toBe("focused");
    expect(broad.findings.find((item) => item.id === "access-surface")?.summary).not.toMatch(
      /weak/,
    );
    expect(broad.gaps?.some((item) => item.id === "gap-agent-access")).toBe(true);
  });

  it("distinguishes published knowledge content from empty content and from unknown", () => {
    const present = buildOrgIntelligence({
      ...base,
      knowledge: {
        enabled: true,
        articleObjects: ["Knowledge__kav"],
        dataCategories: [],
        articleCountsKnown: true,
        articles: { draft: 0, published: 4, archived: 0 },
      },
    });
    const none = buildOrgIntelligence({
      ...base,
      knowledge: {
        enabled: false,
        articleObjects: ["Knowledge__kav"],
        dataCategories: [],
        articleCountsKnown: true,
        articles: { draft: 0, published: 0, archived: 0 },
      },
      observed: { knowledge: true },
    });
    const unknown = buildOrgIntelligence({ ...base, knowledge: null });

    expect(present.findings.some((item) => item.id === "knowledge-present")).toBe(true);
    expect(present.knowledge.coverageKnown).toBe(false);
    expect(none.findings.some((item) => item.id === "knowledge-empty")).toBe(true);
    expect(unknown.findings.some((item) => item.id === "knowledge-unknown")).toBe(true);
  });

  it("captures external dependencies and existing Agentforce without inventing overlap", () => {
    const model = buildOrgIntelligence({
      ...base,
      integrations: {
        endpoints: [{ name: "Claims API", kind: "named_credential", host: "claims.example.com" }],
      },
      agentforce: { available: true, items: [{ name: "Service Copilot", kind: "agent" }] },
    });

    expect(model.integration.available).toBe(true);
    expect(model.findings.some((item) => item.id === "integration-present")).toBe(true);
    expect(model.agentforce?.netNew).toBe(false);
    expect(model.findings.some((item) => item.id === "agentforce-present")).toBe(true);
  });

  it("keeps failed or partial MCP results as unknown rather than false", () => {
    const partial = factsFromResults(
      {
        projectType: base.projectType,
        objective: base.objective,
        outcomes: base.outcomes,
      },
      [
        {
          tool: "list_objects",
          ok: true,
          data: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
        },
        { tool: "list_automations", ok: false, data: null },
        { tool: "knowledge_posture", ok: false, data: null },
        { tool: "get_integration_map", ok: false, data: null },
      ],
    );
    const model = buildOrgIntelligence(partial);

    expect(partial.observed?.automations).toBe(false);
    expect(partial.observed?.knowledge).toBe(false);
    expect(model.findings.some((item) => item.id === "knowledge-unknown")).toBe(true);
    expect(model.gaps?.some((item) => item.id === "gap-automation")).toBe(true);
    expect(model.gaps?.some((item) => item.id === "gap-integrations")).toBe(true);
    expect(model.automation.active).toBe(0);
  });

  it("does not let Opportunity Fit rewrite intelligence, and preserves historical runs", () => {
    const facts: AssessmentFacts = {
      ...base,
      objects: [{ apiName: "Case", label: "Case", custom: false, queryable: true }],
      describes: { Case: caseDescribe({ custom: true }) },
    };
    const intelligence = buildOrgIntelligence(facts);
    const context = normalizeSignals(facts, intelligence);
    const pool = durableWorkFromFacts(facts);
    const fits = groundOpportunityFits(
      fallbackOpportunityFits(pool).map((fit) => ({ ...fit, apiName: "Case" })),
      intelligence,
      context.signals,
    );
    const named = attachOpportunityName(
      intelligence,
      fits[0] ? `${fits[0].label} agent` : "Service agent",
    );
    const first = stampOrgIntelligenceRun(named, "run-1");
    const second = stampOrgIntelligenceRun(buildOrgIntelligence(base), "run-2");

    expect(named.workload.primary[0]?.apiName).toBe("Case");
    expect(fits[0]?.supportingFindingIds?.length).toBeGreaterThan(0);
    expect(first.runId).toBe("run-1");
    expect(second.runId).toBe("run-2");
    expect(first.findings).not.toEqual(second.findings);
  });
});
