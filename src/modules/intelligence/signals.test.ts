import { describe, expect, it } from "vitest";
import {
  normalizeSignals,
  signalExplainer,
  signalExplainers,
  splitSignalCopy,
} from "@/modules/intelligence/signals";
import { signalKeys } from "@/modules/intelligence/types";
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

describe("business signals", () => {
  it("normalizes connector facts into six business signals", () => {
    const context = normalizeSignals({
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
            required: index < 2,
            custom: false,
          })),
          recordTypes: [],
        },
      },
      knowledge: { enabled: true, articleObjects: ["Knowledge__kav"], dataCategories: [] },
      security: { profileCount: 10, permissionSetCount: 4 },
      automations: [
        {
          kind: "flow",
          name: "Case_Route",
          namespace: null,
          status: "Active",
          size: null,
          triggerType: "after save",
        },
      ],
      validationRules: [{ name: "Require_Origin", objectApiName: "Case", active: true }],
    });

    const collision = context.signals.find((item) => item.key === "automation_collision");
    expect(collision?.evidence.some((entry) => /Case_Route/.test(entry.citation))).toBe(
      true,
    );
    const writeback = context.signals.find((item) => item.key === "writeback_control");
    expect(writeback?.evidence.some((entry) => /Require_Origin on Case/.test(entry.citation))).toBe(
      true,
    );

    expect(context.workKinds).toEqual(["service"]);
    expect(context.signals).toHaveLength(6);
    expect(context.signals.map((item) => item.title)).toEqual([
      "Addressable work",
      "Operating path",
      "Grounded answers",
      "Automation collision",
      "Access control",
      "Write-back control",
    ]);
    expect(context.signals.every((item) => item.evidence.length > 0)).toBe(true);
    expect(context.signals.every((item) => item.consumption)).toBe(true);

    const work = context.signals.find((item) => item.key === "addressable_work");
    expect(work?.score).toBeGreaterThan(
      normalizeSignals(emptyFacts).signals.find((item) => item.key === "addressable_work")
        ?.score ?? 0,
    );
    const path = context.signals.find((item) => item.key === "operating_path");
    expect(path?.strength).toBe("mixed");
  });

  it("scores operating path strong only when statuses and assignment exist", () => {
    const mixed = normalizeSignals({
      ...emptyFacts,
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
      ],
      validationRules: [
        { name: "Require_Origin", objectApiName: "Case", active: true },
      ],
    });
    const strong = normalizeSignals({
      ...emptyFacts,
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
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
              picklistLabels: ["New", "Working", "Closed"],
            },
            {
              apiName: "Reason__c",
              label: "Reason",
              type: "string",
              required: false,
              custom: true,
            },
          ],
          recordTypes: [],
        },
      },
      process: {
        queues: [{ name: "Tier 1", objectApiName: "Case" }],
        assignmentRules: [
          { name: "Case Routing", objectApiName: "Case", active: true },
        ],
        businessHours: [],
      },
    });

    expect(
      mixed.signals.find((item) => item.key === "operating_path")?.strength,
    ).toBe("mixed");
    expect(
      strong.signals.find((item) => item.key === "operating_path")?.strength,
    ).toBe("strong");
  });

  it("cites path statuses, queues, and profile names when tools returned them", () => {
    const context = normalizeSignals({
      ...emptyFacts,
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
              required: true,
              custom: false,
              picklistLabels: ["New", "Working", "Closed"],
            },
          ],
          recordTypes: [
            { developerName: "Support", label: "Support", active: true },
          ],
        },
      },
      process: {
        queues: [{ name: "Tier 1" }],
        assignmentRules: [
          { name: "Case Routing", objectApiName: "Case", active: true },
        ],
        businessHours: [{ name: "Default", active: true }],
      },
      security: {
        profileCount: 3,
        permissionSetCount: 2,
        profileNames: ["Admin", "Standard User", "Minimum Access"],
        permissionSetNames: ["Case Agent"],
      },
    });
    const path = context.signals.find((item) => item.key === "operating_path");
    const access = context.signals.find((item) => item.key === "access_surface");
    expect(path?.evidence.some((entry) => /New/.test(entry.citation))).toBe(true);
    expect(path?.evidence.some((entry) => /Tier 1/.test(entry.citation))).toBe(
      true,
    );
    expect(access?.evidence.some((entry) => /Admin/.test(entry.citation))).toBe(
      true,
    );
  });

  it("cites profile names when security_summary returned them", () => {
    const context = normalizeSignals({
      ...emptyFacts,
      security: {
        profileCount: 3,
        permissionSetCount: 2,
        profileNames: ["Admin", "Standard User", "Minimum Access"],
        permissionSetNames: ["Case Agent"],
      },
    });
    const access = context.signals.find((item) => item.key === "access_surface");
    expect(access?.evidence.some((entry) => /Admin/.test(entry.citation))).toBe(
      true,
    );
    expect(access?.evidence.some((entry) => /Case Agent/.test(entry.citation))).toBe(
      true,
    );
  });

  it("cites a custom durable work object when that is the operational record", () => {
    const context = normalizeSignals({
      ...emptyFacts,
      projectType: "AI Opportunity Assessment",
      objective: "Provider credentialing",
      outcomes: ["Faster credentialing decisions"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        {
          apiName: "Credentialing__c",
          label: "Credentialing",
          custom: true,
          queryable: true,
        },
      ],
      describes: {
        Credentialing__c: {
          apiName: "Credentialing__c",
          label: "Credentialing",
          custom: true,
          fields: Array.from({ length: 22 }, (_, index) => ({
            apiName: index === 0 ? "Status" : `Field${index}`,
            label: index === 0 ? "Status" : `Field ${index}`,
            type: index === 0 ? "picklist" : "string",
            required: false,
            custom: true,
            picklistLabels: index === 0 ? ["Submitted", "Approved"] : undefined,
          })),
          recordTypes: [],
        },
      },
    });

    const work = context.signals.find((item) => item.key === "addressable_work");
    expect(work?.meaning).toMatch(/Credentialing is the durable work record/);
    expect(work?.evidence.some((entry) => /Credentialing/.test(entry.citation))).toBe(
      true,
    );
    expect(
      work?.evidence.some((entry) => /Custom objects:.*Credentialing/.test(entry.citation)),
    ).toBe(true);
  });

  it("does not emit hygiene category names or Salesforce prices", () => {
    const text = JSON.stringify(normalizeSignals(emptyFacts));
    expect(text).not.toContain('"Data"');
    expect(text).not.toContain('"Process"');
    expect(text).not.toMatch(/\$\d/);
  });

  it("explains every business signal", () => {
    expect(signalKeys.every((key) => signalExplainers[key].length > 0)).toBe(
      true,
    );
    expect(signalExplainer("addressable_work")).toContain("durable work");
    expect(signalExplainer("unknown")).toBeUndefined();
  });

  it("splits meaning from the consumption implication", () => {
    const stored = splitSignalCopy(
      "Approved content exists, so answers can be grounded instead of invented.\n\nRetrieval turns can be forecast against published answers.",
    );
    const legacy = splitSignalCopy(
      "Approved content exists, so answers can be grounded instead of invented. Retrieval turns can be forecast against published answers.",
    );

    expect(stored.consumption).toContain("Retrieval turns");
    expect(legacy.consumption).toContain("Retrieval turns");
    expect(stored.meaning).not.toContain("Retrieval turns");
  });
});
