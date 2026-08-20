import { describe, expect, it } from "vitest";
import type { AssessmentFacts } from "@/modules/intelligence/types";
import {
  durableWorkFromFacts,
  selectWorkObjectsToDescribe,
} from "@/modules/intelligence/work-objects";

const emptyFacts: AssessmentFacts = {
  projectType: "AI Opportunity Assessment",
  objective: "Provider credentialing",
  outcomes: ["Faster credentialing decisions"],
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

describe("durable work objects", () => {
  it("ranks a credentialing custom object above Case when the objective is credentialing", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
        {
          apiName: "Credentialing__c",
          label: "Credentialing",
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
              apiName: "Status",
              label: "Status",
              type: "picklist",
              required: false,
              custom: false,
              picklistLabels: ["New", "Closed"],
            },
          ],
          recordTypes: [],
        },
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
              custom: true,
              picklistLabels: ["Submitted", "Approved"],
            },
          ],
          recordTypes: [],
        },
      },
    });

    expect(work.find((item) => item.role === "primary")?.apiName).toBe(
      "Credentialing__c",
    );
    expect(work.find((item) => item.apiName === "Case")).toBeUndefined();
    expect(work.find((item) => item.apiName === "Account")).toBeUndefined();
  });

  it("does not treat unused standard Case as operating work", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI / Agent Deployment",
      objective: "Find patient-service use cases",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
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
    });

    expect(work.some((item) => item.apiName === "Case")).toBe(false);
    expect(work.find((item) => item.role === "primary")).toBeUndefined();
  });

  it("treats Case as operating work when metadata shows it is in use", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI / Agent Deployment",
      objective: "Find patient-service use cases",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
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
      },
    });

    expect(work.find((item) => item.role === "primary")?.apiName).toBe("Case");
  });

  it("treats a Flow bound to Case as usage evidence", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI / Agent Deployment",
      objective: "Find patient-service use cases",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
      ],
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
        },
      ],
    });

    expect(work.find((item) => item.apiName === "Case")?.usedInModel).toBe(true);
  });

  it("selects queryable custom objects to describe and skips platform noise", () => {
    const names = selectWorkObjectsToDescribe(
      [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        {
          apiName: "Credentialing__c",
          label: "Credentialing",
          custom: true,
          queryable: true,
        },
        { apiName: "Widget__c", label: "Widget", custom: true, queryable: true },
        {
          apiName: "Credentialing__Share",
          label: "Credentialing Share",
          custom: true,
          queryable: true,
        },
        {
          apiName: "Credentialing__History",
          label: "Credentialing History",
          custom: true,
          queryable: true,
        },
      ],
      {
        projectType: "AI Opportunity Assessment",
        objective: "Provider credentialing",
        outcomes: ["Faster credentialing decisions"],
      },
    );

    expect(names).toContain("Case");
    expect(names).toContain("Credentialing__c");
    expect(names).toContain("Widget__c");
    expect(names).not.toContain("Credentialing__Share");
    expect(names).not.toContain("Credentialing__History");
  });

  it("describes Health Cloud and Revenue Cloud objects from inventory, not a product shortlist", () => {
    const names = selectWorkObjectsToDescribe(
      [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "CarePlan", label: "Care Plan", custom: false, queryable: true },
        { apiName: "Quote", label: "Quote", custom: false, queryable: true },
        { apiName: "Campaign", label: "Campaign", custom: false, queryable: true },
        {
          apiName: "AIInsightValue",
          label: "AI Insight Value",
          custom: false,
          queryable: true,
          layoutable: false,
        },
      ],
      {
        projectType: "AI Opportunity Assessment",
        objective: "Find patient-service use cases",
        outcomes: ["Improve customer experience"],
      },
    );

    expect(names).toEqual(
      expect.arrayContaining(["Case", "CarePlan", "Quote", "Campaign"]),
    );
    expect(names).not.toContain("AIInsightValue");
  });

  it("treats a Health Cloud object as operating work when metadata shows use", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI / Agent Deployment",
      objective: "Improve care coordination",
      outcomes: ["Faster care plan updates"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "CarePlan", label: "Care Plan", custom: false, queryable: true },
      ],
      describes: {
        CarePlan: {
          apiName: "CarePlan",
          label: "Care Plan",
          custom: false,
          fields: [
            {
              apiName: "Status",
              label: "Status",
              type: "picklist",
              required: false,
              custom: false,
              picklistLabels: ["Draft", "Active"],
            },
            {
              apiName: "Pathway__c",
              label: "Pathway",
              type: "string",
              required: false,
              custom: true,
            },
          ],
          recordTypes: [],
        },
      },
    });

    expect(work.find((item) => item.role === "primary")?.apiName).toBe("CarePlan");
    expect(work.some((item) => item.apiName === "Case")).toBe(false);
  });

  it("ranks Sales Forecast above Case when both are present", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI Opportunity Assessment",
      objective: "Find patient-service use cases",
      outcomes: ["Improve customer experience"],
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
              apiName: "Status",
              label: "Status",
              type: "picklist",
              required: false,
              custom: false,
              picklistLabels: ["Draft", "Submitted"],
            },
          ],
          recordTypes: [],
        },
      },
    });

    expect(work.find((item) => item.role === "primary")?.apiName).toBe(
      "Sales_Forecast__c",
    );
  });

  it("names every listed custom object as durable work without a vocabulary match", () => {
    const work = durableWorkFromFacts({
      ...emptyFacts,
      projectType: "AI / Agent Deployment",
      objective: "Find patient-service use cases",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        {
          apiName: "ZZZ_Thing__c",
          label: "Thing",
          custom: true,
          queryable: true,
        },
        { apiName: "Widget__c", label: "Widget", custom: true, queryable: true },
        {
          apiName: "Widget__Share",
          label: "Widget Share",
          custom: true,
          queryable: true,
        },
      ],
    });

    expect(work.map((item) => item.apiName)).toEqual(
      expect.arrayContaining(["ZZZ_Thing__c", "Widget__c"]),
    );
    expect(work.some((item) => item.apiName === "Widget__Share")).toBe(false);
    expect(work.some((item) => item.apiName === "Case")).toBe(false);
  });

  it("caps describes and prefers objects this run already referenced", () => {
    const customs = Array.from({ length: 20 }, (_, index) => ({
      apiName: `Custom_${String(index).padStart(2, "0")}__c`,
      label: `Custom ${index}`,
      custom: true,
      queryable: true,
    }));
    const names = selectWorkObjectsToDescribe(
      [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        ...customs,
      ],
      {
        projectType: "AI / Agent Deployment",
        objective: "Find patient-service use cases",
        outcomes: ["Improve customer experience"],
        referencedNames: ["Custom_19__c"],
      },
    );

    expect(names).toContain("Custom_19__c");
    expect(names).toHaveLength(16);
    expect(names).not.toContain("Custom_18__c");
  });
});
