import { describe, expect, it } from "vitest";
import {
  attachOpportunityName,
  buildOrgIntelligence,
  formatOrgIntelligenceBrief,
  hydrateOrgIntelligence,
  stampOrgIntelligenceRun,
  workFitPoolFromIntelligence,
} from "@/modules/intelligence/org-intelligence";
import { factsFromTraces } from "@/modules/intelligence/summarize";
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
  knowledge: { enabled: true, articleObjects: ["Knowledge__kav"], dataCategories: [] },
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
    expect(model.workload.primary[0]).toBeUndefined();
    expect(model.findings.some((item) => item.id === "work-unused-standard")).toBe(
      true,
    );
    expect(model.workload.volumeAvailable).toBe(false);
    expect(model.data.qualityAvailable).toBe(false);
    expect(model.knowledge.coverageKnown).toBe(false);
    expect(model.integration.available).toBe(false);
    expect(model.summary.notObserved).toEqual([
      "Workload volume was not observed",
      "Data quality statistics were not observed",
      "External-system integrations were not observed",
      "Existing AI configuration was not observed",
    ]);
    expect(formatOrgIntelligenceBrief(model)).toMatch(
      /Custom objects named on this run\. Names were not stored/,
    );
    expect(formatOrgIntelligenceBrief(model)).toMatch(/What was not observed/);
    expect(formatOrgIntelligenceBrief(model)).toMatch(/Workload volume was not observed/);
    expect(formatOrgIntelligenceBrief(model)).toMatch(
      /Data quality statistics were not observed/,
    );
    expect(formatOrgIntelligenceBrief(model)).toMatch(
      /External-system integrations were not observed/,
    );
    expect(model.summary.strongestOpportunity).toBe("Service agent");
    expect(model.findings.some((item) => item.id === "work-primary")).toBe(false);
    expect(model.findings.some((item) => item.id === "automation-thin")).toBe(true);
    expect(model.automation.map).toEqual([]);
    expect(model.agentforce?.available).toBe(false);
    expect(model.integration.available).toBe(false);
    expect(model.process.path).toEqual([]);
    expect(JSON.stringify(model)).not.toMatch(/\d+%/);
    expect(JSON.stringify(model)).not.toMatch(/\$\d/);
  });

  it("does not treat default Case statuses as an operating lifecycle", () => {
    const model = buildOrgIntelligence(facts);
    expect(model.findings.find((item) => item.id === "process-lifecycle")).toBeUndefined();
    expect(model.findings.find((item) => item.id === "process-missing")).toBeDefined();
    expect(model.process.observedPaths).toEqual([]);
  });

  it("marks process inference separately from observed statuses when Case is in use", () => {
    const model = buildOrgIntelligence({
      ...facts,
      describes: {
        Case: {
          ...facts.describes.Case,
          fields: [
            ...facts.describes.Case.fields,
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
          ],
        },
      },
    });
    const lifecycle = model.findings.find((item) => item.id === "process-lifecycle");
    expect(lifecycle?.provenance).toBe("inferred");
    expect(lifecycle?.summary).toMatch(/Observed Case statuses/);
    expect(lifecycle?.summary).toMatch(/New/);
    expect(model.workload.primary[0]?.label).toBe("Case");
  });

  it("treats a credentialing custom object as primary durable work even when Case exists", () => {
    const model = buildOrgIntelligence({
      ...facts,
      projectType: "AI Opportunity Assessment",
      objective: "Provider credentialing",
      outcomes: ["Faster credentialing decisions"],
      objects: [
        ...facts.objects,
        {
          apiName: "Credentialing__c",
          label: "Credentialing",
          custom: true,
          queryable: true,
        },
        { apiName: "Widget__c", label: "Widget", custom: true, queryable: true },
      ],
      describes: {
        ...facts.describes,
        Credentialing__c: {
          apiName: "Credentialing__c",
          label: "Credentialing",
          custom: true,
          fields: [
            {
              apiName: "Status",
              label: "Status",
              type: "picklist",
              required: false,
              custom: false,
              picklistLabels: ["Submitted", "In Review", "Approved"],
            },
          ],
          recordTypes: [],
        },
      },
    });

    expect(model.environment.customObjectNames.some((name) => /Credentialing/.test(name))).toBe(
      true,
    );
    expect(formatOrgIntelligenceBrief(model)).toMatch(/Credentialing__c/);
    expect(model.workload.primary[0]?.apiName).toBe("Credentialing__c");
    expect(model.findings.find((item) => item.id === "work-primary")?.title).toMatch(
      /Credentialing is the primary durable work object/,
    );
    expect(model.summary.meaning).toMatch(/Credentialing/);
    expect(model.process.observedPaths.some((path) => path.objectLabel === "Credentialing")).toBe(
      true,
    );
  });

  it("recovers a custom work object on Ask when the stored brief omitted the names", () => {
    const stored = buildOrgIntelligence({
      ...facts,
      objects: [
        ...facts.objects,
        {
          apiName: "Sales_Forecast__c",
          label: "Sales Forecast",
          custom: true,
          queryable: true,
        },
      ],
    });
    stored.environment.customObjectNames = [];
    stored.environment.inventoryObjectNames = [];
    stored.environment.customObjectCount = null;

    const hydrated = hydrateOrgIntelligence(stored, {
      ...facts,
      objects: [
        {
          apiName: "Sales_Forecast__c",
          label: "Sales Forecast",
          custom: true,
          queryable: true,
        },
      ],
    });

    expect(hydrated.environment.customObjectNames).toEqual([
      "Sales Forecast (Sales_Forecast__c)",
    ]);
    expect(formatOrgIntelligenceBrief(hydrated)).toMatch(
      /Custom objects named on this run\. 1\. Sales Forecast \(Sales_Forecast__c\)/,
    );
    expect(formatOrgIntelligenceBrief(hydrated)).not.toMatch(
      /Custom objects named on this run\. None/,
    );
  });

  it("rebuilds a described custom object when list_objects omitted it from present", () => {
    const recovered = factsFromTraces(
      {
        projectType: "AI Opportunity Assessment",
        objective: "Find patient-service use cases",
        outcomes: ["Improve customer experience"],
      },
      [
        {
          tool: "list_objects",
          ok: true,
          summary: { count: 1, custom: 0, present: ["Case"] },
        },
        {
          tool: "describe_object",
          apiName: "Sales_Forecast__c",
          ok: true,
          summary: {
            apiName: "Sales_Forecast__c",
            label: "Sales Forecast",
            custom: true,
            fieldCount: 2,
            required: [],
            recordTypes: [],
            statuses: ["Draft"],
          },
        },
      ],
    );

    expect(
      recovered.objects.find((item) => item.apiName === "Sales_Forecast__c"),
    ).toMatchObject({
      label: "Sales Forecast",
      custom: true,
    });
  });

  it("builds an automation map, process path, and integration findings from metadata maps", () => {
    const model = buildOrgIntelligence({
      ...facts,
      describes: {
        Case: {
          ...facts.describes.Case,
          fields: [
            ...facts.describes.Case.fields,
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
            {
              apiName: "AccountId",
              label: "Account",
              type: "reference",
              required: false,
              custom: false,
              relationshipKind: "lookup",
              referenceTo: ["Account"],
            },
          ],
        },
      },
      automations: [
        {
          kind: "flow",
          name: "Case_Assignment",
          namespace: null,
          status: "Active",
          size: null,
          objectApiName: "Case",
          objectLabel: "Case",
          triggerType: "after save",
          actions: [],
          fieldsAffected: [],
        },
      ],
      process: {
        queues: [{ name: "Tier 1", objectApiName: "Case" }],
        assignmentRules: [
          { name: "Case Routing", objectApiName: "Case", active: true },
        ],
        escalationRules: [
          { name: "Case Escalate", objectApiName: "Case", active: true },
        ],
        approvalProcesses: [],
        businessHours: [{ name: "Default", active: true }],
      },
      integrations: {
        endpoints: [
          { name: "Claims API", kind: "named_credential", host: "claims.example.com" },
        ],
      },
      agentforce: {
        available: true,
        items: [{ name: "Service Copilot", kind: "agent" }],
      },
    });

    expect(model.workload.primary[0]?.apiName).toBe("Case");
    expect(model.automation.objectsTouched).toContain("Case");
    expect(model.automation.map[0]?.name).toBe("Case_Assignment");
    expect(model.process.path.map((step) => step.stage)).toContain("assignment");
    expect(model.process.path.map((step) => step.stage)).toContain("escalation");
    expect(model.data.relationships.some((item) => item.toLabel === "Account")).toBe(
      true,
    );
    expect(model.integration.available).toBe(true);
    expect(model.integration.observed[0]).toMatch(/Claims API/);
    expect(model.findings.some((item) => item.id === "integration-present")).toBe(
      true,
    );
    expect(model.agentforce?.netNew).toBe(false);
    expect(model.findings.some((item) => item.id === "agentforce-present")).toBe(
      true,
    );
    expect(model.summary.notObserved).not.toContain(
      "External-system integrations were not observed",
    );
  });

  it("does not let a selected opportunity change primary work", () => {
    const used = {
      ...facts,
      describes: {
        Case: {
          ...facts.describes.Case,
          fields: [
            ...facts.describes.Case.fields,
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
          ],
        },
      },
    };
    const before = buildOrgIntelligence(used);
    const after = attachOpportunityName(before, "Account agent");

    expect(before.workload.primary[0]?.apiName).toBe("Case");
    expect(after.workload.primary[0]?.apiName).toBe("Case");
    expect(after.findings.map((item) => item.id)).toEqual(
      before.findings.map((item) => item.id),
    );
    expect(after.summary.strongestOpportunity).toBe("Account agent");
    expect(
      workFitPoolFromIntelligence(after, used).find((item) => item.role === "primary")
        ?.apiName,
    ).toBe("Case");
  });

  it("represents volume as unknown instead of inventing a count", () => {
    const model = buildOrgIntelligence({
      ...facts,
      describes: {
        Case: {
          ...facts.describes.Case,
          fields: [
            ...facts.describes.Case.fields,
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
          ],
        },
      },
    });

    expect(model.workload.primary[0]?.volume).toEqual({
      value: null,
      basis: "unknown",
      status: "unknown",
    });
    expect(model.workload.volumeAvailable).toBe(false);
    expect(JSON.stringify(model.workload)).not.toMatch(/"value":\s*[1-9]/);
    expect(model.gaps?.some((item) => item.id === "gap-volume")).toBe(true);
  });

  it("does not treat an expert-user object as a knowledge base", () => {
    const model = buildOrgIntelligence({
      ...facts,
      knowledge: {
        enabled: true,
        articleObjects: ["KnowledgeableUser", "KnowledgeArticleViewStat"],
        dataCategories: [],
      },
      observed: { knowledge: true },
    });

    expect(model.knowledge.enabled).toBe(false);
    expect(model.knowledge.sources).toEqual([]);
    expect(model.findings.some((item) => item.id === "knowledge-empty")).toBe(
      false,
    );
    expect(model.findings.some((item) => item.id === "knowledge-present")).toBe(
      false,
    );
    expect(model.findings.some((item) => item.id === "knowledge-content-unknown")).toBe(
      true,
    );
  });

  it("judges knowledge from article counts, not object types", () => {
    const empty = buildOrgIntelligence({
      ...facts,
      knowledge: {
        enabled: false,
        articleObjects: ["Knowledge__kav"],
        dataCategories: [],
        articleCountsKnown: true,
        articles: { draft: 0, published: 0, archived: 0 },
      },
    });
    const published = buildOrgIntelligence({
      ...facts,
      knowledge: {
        enabled: true,
        articleObjects: ["Knowledge__kav"],
        dataCategories: [],
        articleCountsKnown: true,
        articles: { draft: 0, published: 8, archived: 0 },
      },
    });

    expect(empty.knowledge.enabled).toBe(false);
    expect(empty.environment.knowledgePosture).toBe("absent");
    expect(empty.findings.some((item) => item.id === "knowledge-empty")).toBe(true);
    expect(empty.findings.find((item) => item.id === "knowledge-empty")?.summary).toMatch(
      /No draft, published, or archived articles/i,
    );
    expect(published.knowledge.enabled).toBe(true);
    expect(published.environment.knowledgePosture).toBe("present");
    expect(published.findings.some((item) => item.id === "knowledge-present")).toBe(
      true,
    );
    expect(published.findings.find((item) => item.id === "knowledge-present")?.summary).toMatch(
      /Published articles: 8/,
    );
  });

  it("treats missing knowledge evidence as unknown, not as no knowledge", () => {
    const unknown = buildOrgIntelligence({ ...facts, knowledge: null });
    const absent = buildOrgIntelligence({
      ...facts,
      knowledge: { enabled: false, articleObjects: [], dataCategories: [] },
      observed: { knowledge: true },
    });

    expect(unknown.findings.some((item) => item.id === "knowledge-unknown")).toBe(
      true,
    );
    expect(unknown.findings.some((item) => item.id === "knowledge-empty")).toBe(
      false,
    );
    expect(absent.findings.some((item) => item.id === "knowledge-content-unknown")).toBe(
      true,
    );
    expect(absent.findings.some((item) => item.id === "knowledge-unknown")).toBe(
      false,
    );
  });

  it("preserves a prior run when a new model is stamped", () => {
    const first = stampOrgIntelligenceRun(buildOrgIntelligence(facts), "run-1");
    const second = stampOrgIntelligenceRun(
      buildOrgIntelligence({
        ...facts,
        knowledge: {
          enabled: false,
          articleObjects: ["Knowledge__kav"],
          dataCategories: [],
          articleCountsKnown: true,
          articles: { draft: 0, published: 0, archived: 0 },
        },
        observed: { knowledge: true },
      }),
      "run-2",
    );

    expect(first.runId).toBe("run-1");
    expect(second.runId).toBe("run-2");
    expect(first.findings.some((item) => item.id === "knowledge-content-unknown")).toBe(
      true,
    );
    expect(second.findings.some((item) => item.id === "knowledge-empty")).toBe(
      true,
    );
    expect(first.findings).not.toEqual(second.findings);
  });
});
