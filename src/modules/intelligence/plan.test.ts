import { describe, expect, it } from "vitest";
import {
  followUpToolPlan,
  initialToolPlan,
} from "@/modules/intelligence/plan";

describe("assessment tool plan", () => {
  it("starts with identity and object inventory only", () => {
    expect(initialToolPlan()).toEqual([
      { tool: "get_connection" },
      { tool: "list_objects" },
    ]);
  });

  it("describes inventory objects from any cloud and never dumps the catalog", () => {
    const followUp = followUpToolPlan({
      projectType: "AI Opportunity Assessment",
      objective: "Patient service deflection",
      outcomes: ["Improve customer experience"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
        { apiName: "CarePlan", label: "Care Plan", custom: false, queryable: true },
        { apiName: "Quote", label: "Quote", custom: false, queryable: true },
        {
          apiName: "AIInsightValue",
          label: "AI Insight Value",
          custom: false,
          queryable: true,
          layoutable: false,
        },
      ],
    });

    const describes = followUp
      .filter((call) => call.tool === "describe_object")
      .map((call) => call.apiName);
    expect(describes).toEqual(
      expect.arrayContaining(["Case", "Account", "CarePlan", "Quote"]),
    );
    expect(describes).not.toContain("AIInsightValue");
    expect(followUp.some((call) => call.tool === "list_automations")).toBe(true);
    expect(followUp.some((call) => call.tool === "get_integration_map")).toBe(true);
    expect(followUp.some((call) => call.tool === "get_agentforce_configuration")).toBe(
      true,
    );
    expect(followUp.some((call) => call.tool === "list_process_controls")).toBe(
      true,
    );
    const tools = followUp.map((call) => call.tool);
    expect(tools.indexOf("knowledge_posture")).toBeGreaterThan(-1);
    expect(tools.indexOf("knowledge_posture")).toBeLessThan(
      tools.indexOf("describe_object"),
    );
  });

  it("describes listed custom objects and skips share and history artifacts", () => {
    const followUp = followUpToolPlan({
      projectType: "AI Opportunity Assessment",
      objective: "Provider credentialing",
      outcomes: ["Faster credentialing decisions"],
      objects: [
        { apiName: "Case", label: "Case", custom: false, queryable: true },
        { apiName: "Account", label: "Account", custom: false, queryable: true },
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
      ],
    });

    const describes = followUp
      .filter((call) => call.tool === "describe_object")
      .map((call) => call.apiName);
    expect(describes).toContain("Credentialing__c");
    expect(describes).toContain("Widget__c");
    expect(describes).not.toContain("Credentialing__Share");
  });

  it("describes a sales forecast custom object on a service objective", () => {
    const followUp = followUpToolPlan({
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
    });

    expect(
      followUp
        .filter((call) => call.tool === "describe_object")
        .map((call) => call.apiName),
    ).toContain("Sales_Forecast__c");
  });
});
