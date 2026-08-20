import { describe, expect, it } from "vitest";
import {
  buildOrgIntelligence,
  formatOrgIntelligenceBrief,
} from "@/modules/intelligence/org-intelligence";
import type { AssessmentFacts } from "@/modules/intelligence/types";

const facts: AssessmentFacts = {
  projectType: "AI / Agent Deployment",
  objective: "Find patient-service use cases",
  outcomes: ["Improve customer experience"],
  connection: {
    connectionId: "c1",
    organizationId: "o1",
    platformType: "SALESFORCE",
    status: "CONNECTED",
    externalOrgId: "00Dxx",
    externalOrgName: "Foundry360 Prod Org",
    instanceKind: "production",
    org: {
      metadataType: "Organization",
      name: "Foundry360 Prod Org",
      orgId: "00Dxx",
      organizationType: "Enterprise Edition",
      instanceKind: "production",
      instanceName: "na1",
      namespacePrefix: null,
      createdAt: null,
      createdBy: null,
      lastModifiedAt: null,
      lastModifiedBy: null,
      locale: null,
      language: null,
      timeZone: null,
    },
  },
  objects: [
    { apiName: "Case", label: "Case", custom: false, queryable: true },
    { apiName: "WorkOrder", label: "Work Order", custom: false, queryable: true },
    { apiName: "Incident", label: "Incident", custom: false, queryable: true },
    { apiName: "Account", label: "Account", custom: false, queryable: true },
    { apiName: "Contact", label: "Contact", custom: false, queryable: true },
    { apiName: "Lead", label: "Lead", custom: false, queryable: true },
    { apiName: "Opportunity", label: "Opportunity", custom: false, queryable: true },
  ],
  describes: {
    Case: {
      apiName: "Case",
      label: "Case",
      custom: false,
      fields: [
        {
          apiName: "Status",
          label: "Status",
          type: "picklist",
          required: false,
          custom: false,
          picklistLabels: ["New", "Working", "Escalated", "Closed"],
        },
        ...Array.from({ length: 39 }, (_, index) => ({
          apiName: `Field${index}`,
          label: `Field ${index}`,
          type: "string",
          required: false,
          custom: false,
        })),
      ],
      recordTypes: [{ developerName: "Master", label: "Master", active: true }],
    },
  },
  automations: [],
  validationRules: [],
  process: {
    queues: [],
    assignmentRules: [],
    businessHours: [{ name: "Default", active: true }],
  },
  security: { profileCount: 44, permissionSetCount: 179 },
  knowledge: { enabled: true, articleObjects: ["KnowledgeableUser"], dataCategories: [] },
  limits: {
    dailyApiRequests: { max: 100000, remaining: 90000 },
    dataStorageMb: { max: 10000, remaining: 8000 },
    fileStorageMb: { max: 10000, remaining: 8000 },
  },
};

describe("org intelligence", () => {
  it("builds an operational model without inventing volumes or quality percents", () => {
    const model = buildOrgIntelligence(facts, { opportunityName: "Service agent" });

    expect(model.environment.orgName).toBe("Foundry360 Prod Org");
    expect(model.workload.primary[0]?.label).toBe("Case");
    expect(model.workload.volumeAvailable).toBe(false);
    expect(model.data.qualityAvailable).toBe(false);
    expect(model.knowledge.coverageKnown).toBe(false);
    expect(model.integration.available).toBe(false);
    expect(model.summary.notObserved).toEqual([
      "Workload volume was not observed",
      "Data quality statistics were not observed",
      "External-system integrations were not observed",
    ]);
    expect(formatOrgIntelligenceBrief(model)).toMatch(/What was not observed/);
    expect(formatOrgIntelligenceBrief(model)).toMatch(/Workload volume was not observed/);
    expect(formatOrgIntelligenceBrief(model)).toMatch(
      /Data quality statistics were not observed/,
    );
    expect(formatOrgIntelligenceBrief(model)).toMatch(
      /External-system integrations were not observed/,
    );
    expect(model.summary.strongestOpportunity).toBe("Service agent");
    expect(model.findings.some((item) => item.id === "work-primary")).toBe(true);
    expect(model.findings.some((item) => item.id === "automation-thin")).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/\d+%/);
    expect(JSON.stringify(model)).not.toMatch(/\$\d/);
  });

  it("marks process inference separately from observed statuses", () => {
    const model = buildOrgIntelligence(facts);
    const lifecycle = model.findings.find((item) => item.id === "process-lifecycle");
    expect(lifecycle?.provenance).toBe("inferred");
    expect(lifecycle?.summary).toMatch(/Observed Case statuses/);
    expect(lifecycle?.summary).toMatch(/New/);
  });
});
