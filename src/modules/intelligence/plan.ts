import type { EnterpriseObject } from "@/modules/enterprise/types";
import type { ToolCall } from "@/modules/intelligence/types";

const serviceObjects = [
  "Case",
  "Account",
  "Contact",
  "Knowledge__kav",
  "KnowledgeArticleVersion",
  "Task",
];

const salesObjects = ["Lead", "Opportunity", "Account", "Contact", "Campaign"];

export const catalogObjects = [...new Set([...serviceObjects, ...salesObjects])];

export function initialToolPlan(): ToolCall[] {
  return [{ tool: "get_connection" }, { tool: "list_objects" }];
}

export function objectCandidates(input: {
  projectType: string;
  objective: string;
  outcomes: string[];
}) {
  const haystack = [
    input.projectType,
    input.objective,
    ...input.outcomes,
  ]
    .join(" ")
    .toLowerCase();

  const service =
    /service|case|patient|knowledge|support|deflect/.test(haystack);
  const sales = /sales|lead|opportun|revenue|pipeline/.test(haystack);
  const names = new Set<string>();

  if (service || (!service && !sales)) {
    for (const name of serviceObjects) {
      names.add(name);
    }
  }
  if (sales || /agentforce|opportunity assessment/.test(haystack)) {
    for (const name of salesObjects) {
      names.add(name);
    }
  }

  return [...names];
}

export function followUpToolPlan(input: {
  projectType: string;
  objective: string;
  outcomes: string[];
  objects: EnterpriseObject[];
}): ToolCall[] {
  const present = new Set(input.objects.map((object) => object.apiName));
  const describes = objectCandidates(input)
    .filter((apiName) => present.has(apiName))
    .map((apiName) => ({ tool: "describe_object" as const, apiName }));

  return [
    ...describes,
    { tool: "list_automations" },
    { tool: "list_validation_rules" },
    { tool: "security_summary" },
    { tool: "knowledge_posture" },
    { tool: "org_limits" },
  ];
}
