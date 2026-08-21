import type { EnterpriseObject } from "@/modules/enterprise/types";
import type { ToolCall } from "@/modules/intelligence/types";
import { selectWorkObjectsToDescribe } from "@/modules/intelligence/work-objects";

export function initialToolPlan(): ToolCall[] {
  return [{ tool: "get_connection" }, { tool: "list_objects" }];
}

export function followUpMapPlan(): ToolCall[] {
  return [
    { tool: "list_automations" },
    { tool: "list_validation_rules" },
    { tool: "list_process_controls" },
    { tool: "knowledge_posture" },
  ];
}

export function followUpContextPlan(): ToolCall[] {
  return [
    { tool: "security_summary" },
    { tool: "org_limits" },
    { tool: "get_integration_map" },
    { tool: "get_agentforce_configuration" },
  ];
}

export function describeObjectPlan(input: {
  projectType: string;
  objective: string;
  outcomes: string[];
  objects: EnterpriseObject[];
  referencedNames?: string[];
}): ToolCall[] {
  return selectWorkObjectsToDescribe(input.objects, {
    projectType: input.projectType,
    objective: input.objective,
    outcomes: input.outcomes,
    referencedNames: input.referencedNames,
  }).map((apiName) => ({ tool: "describe_object" as const, apiName }));
}

export function followUpToolPlan(input: {
  projectType: string;
  objective: string;
  outcomes: string[];
  objects: EnterpriseObject[];
  referencedNames?: string[];
}): ToolCall[] {
  return [
    ...followUpMapPlan(),
    ...describeObjectPlan(input),
    ...followUpContextPlan(),
  ];
}
