import { describe, expect, it } from "vitest";
import {
  followUpToolPlan,
  initialToolPlan,
  objectCandidates,
} from "@/modules/intelligence/plan";

describe("assessment tool plan", () => {
  it("starts with identity and object inventory only", () => {
    expect(initialToolPlan()).toEqual([
      { tool: "get_connection" },
      { tool: "list_objects" },
    ]);
  });

  it("describes Case for a service objective and never dumps every object", () => {
    const followUp = followUpToolPlan({
      projectType: "AI Opportunity Assessment",
      objective: "Patient service deflection",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
        { apiName: "AIInsightValue", label: "AI Insight Value", custom: false, queryable: true },
      ],
    });

    const describes = followUp.filter((call) => call.tool === "describe_object");
    expect(describes.map((call) => call.apiName)).toEqual(["Case", "Account"]);
    expect(followUp.some((call) => call.tool === "list_automations")).toBe(true);
    expect(objectCandidates({
      projectType: "AI Opportunity Assessment",
      objective: "Patient service deflection",
      outcomes: ["Improve customer experience"],
    })).toContain("Case");
  });
});
