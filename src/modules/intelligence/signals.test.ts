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
      validationRules: [{ name: "Require_Origin", objectApiName: "Case", active: true }],
    });

    expect(context.workKinds).toEqual(["service", "customer"]);
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
