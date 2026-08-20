import type { McpToolName } from "@/modules/mcp/catalog";
import type {
  AutomationSummary,
  ConnectionIdentity,
  EnterpriseObject,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  ProcessControls,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";
import { catalogObjects } from "@/modules/intelligence/plan";
import type { AssessmentFacts } from "@/modules/intelligence/types";

const SECRET_KEYS = /token|secret|authorization|bearer|password|cookie/i;

export function summarizeToolResult(
  tool: McpToolName,
  data: unknown,
  apiName?: string,
) {
  assertSafePayload(data);

  if (tool === "get_connection") {
    return data;
  }

  if (tool === "list_objects") {
    const objects = asObjects(data);
    return {
      count: objects.length,
      custom: objects.filter((object) => object.custom).length,
      present: objects
        .filter(
          (object) =>
            object.custom || catalogObjects.includes(object.apiName),
        )
        .map((object) => object.apiName),
    };
  }

  if (tool === "describe_object") {
    const described = data as ObjectDescribe;
    return {
      apiName: described.apiName ?? apiName,
      label: described.label,
      fieldCount: described.fields?.length ?? 0,
      required: (described.fields ?? [])
        .filter((field) => field.required)
        .map((field) => field.apiName),
      recordTypes: (described.recordTypes ?? []).map(
        (recordType) => recordType.developerName,
      ),
      statuses: (described.fields ?? [])
        .filter((field) => /^(status|stagename)$/i.test(field.apiName))
        .flatMap((field) => field.picklistLabels ?? []),
    };
  }

  return data;
}

export function factsFromTraces(
  input: {
    projectType: string;
    objective: string;
    outcomes: string[];
  },
  traces: { tool: string; apiName?: string | null; ok: boolean; summary: unknown }[],
): AssessmentFacts {
  return factsFromResults(
    input,
    traces.map((trace) => ({
      tool: trace.tool as McpToolName,
      apiName: trace.apiName ?? undefined,
      ok: trace.ok,
      data: reconstructTraceData(trace.tool, trace.apiName, trace.summary),
    })),
  );
}

function reconstructTraceData(
  tool: string,
  apiName: string | null | undefined,
  summary: unknown,
) {
  if (!summary || typeof summary !== "object") {
    return summary;
  }

  if (tool === "list_objects") {
    const listed = summary as { present?: string[]; count?: number };
    if (Array.isArray(listed.present)) {
      return listed.present.map((name) => ({
        apiName: name,
        label: name.replace(/([a-z])([A-Z])/g, "$1 $2"),
        custom: name.endsWith("__c"),
        queryable: true,
      }));
    }
  }

  if (tool === "describe_object") {
    const described = summary as {
      apiName?: string;
      label?: string;
      fieldCount?: number;
      required?: string[];
      recordTypes?: string[];
      statuses?: string[];
    };
    const required = described.required ?? [];
    const statuses = described.statuses ?? [];
    const fields: ObjectDescribe["fields"] = [];
    if (statuses.length > 0) {
      fields.push({
        apiName: "Status",
        label: "Status",
        type: "picklist",
        required: required.includes("Status"),
        custom: false,
        picklistLabels: statuses,
      });
    }
    for (const name of required) {
      if (name === "Status") {
        continue;
      }
      fields.push({
        apiName: name,
        label: name,
        type: "string",
        required: true,
        custom: false,
      });
    }
    while (fields.length < (described.fieldCount ?? fields.length)) {
      fields.push({
        apiName: `Field${fields.length}`,
        label: `Field ${fields.length}`,
        type: "string",
        required: false,
        custom: false,
      });
    }
    return {
      apiName: described.apiName ?? apiName ?? "Unknown",
      label: described.label ?? described.apiName ?? apiName ?? "Unknown",
      custom: false,
      fields,
      recordTypes: (described.recordTypes ?? []).map((name) => ({
        developerName: name,
        label: name,
        active: true,
      })),
    };
  }

  return summary;
}

export function factsFromResults(
  input: {
    projectType: string;
    objective: string;
    outcomes: string[];
  },
  results: { tool: McpToolName; apiName?: string; ok: boolean; data: unknown }[],
): AssessmentFacts {
  const facts: AssessmentFacts = {
    projectType: input.projectType,
    objective: input.objective,
    outcomes: input.outcomes,
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

  for (const result of results) {
    if (!result.ok) {
      continue;
    }

    if (result.tool === "get_connection") {
      facts.connection = result.data as ConnectionIdentity;
    }
    if (result.tool === "list_objects") {
      facts.objects = asObjects(result.data);
    }
    if (result.tool === "describe_object" && result.apiName) {
      facts.describes[result.apiName] = result.data as ObjectDescribe;
    }
    if (result.tool === "list_automations") {
      facts.automations = result.data as AutomationSummary[];
    }
    if (result.tool === "list_validation_rules") {
      facts.validationRules = result.data as ValidationRuleSummary[];
    }
    if (result.tool === "list_process_controls") {
      facts.process = result.data as ProcessControls;
    }
    if (result.tool === "security_summary") {
      facts.security = result.data as SecuritySummary;
    }
    if (result.tool === "knowledge_posture") {
      facts.knowledge = result.data as KnowledgePosture;
    }
    if (result.tool === "org_limits") {
      facts.limits = result.data as OrgLimits;
    }
  }

  return facts;
}

function asObjects(data: unknown): EnterpriseObject[] {
  return Array.isArray(data) ? (data as EnterpriseObject[]) : [];
}

function assertSafePayload(value: unknown, path = "data") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafePayload(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEYS.test(key)) {
        throw new Error(`Unsafe key in tool result: ${path}.${key}`);
      }
      assertSafePayload(child, `${path}.${key}`);
    }
  }
}
