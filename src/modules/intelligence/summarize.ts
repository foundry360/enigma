import type { McpToolName } from "@/modules/mcp/catalog";
import type {
  AgentforceConfiguration,
  AutomationSummary,
  ConnectionIdentity,
  EnterpriseObject,
  IntegrationMap,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  ProcessControls,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";
import { visibleFields } from "@/modules/enterprise/fields";
import type { AssessmentFacts } from "@/modules/intelligence/types";
import {
  listedCustomObjects,
  listedInventoryObjects,
} from "@/modules/intelligence/work-objects";

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
    const custom = listedCustomObjects(objects);
    return {
      count: objects.length,
      custom: custom.length,
      customNames: custom.map((object) => `${object.label} (${object.apiName})`),
      present: listedInventoryObjects(objects).map((object) => object.apiName),
    };
  }

  if (tool === "describe_object") {
    const described = data as ObjectDescribe;
    return {
      apiName: described.apiName ?? apiName,
      label: described.label,
      custom: described.custom,
      fieldCount: visibleFields(described.fields ?? []).length,
      required: (described.fields ?? [])
        .filter((field) => field.required)
        .map((field) => field.apiName),
      recordTypes: (described.recordTypes ?? []).map(
        (recordType) => recordType.developerName,
      ),
      statuses: (described.fields ?? [])
        .filter((field) => /^(status|stagename)$/i.test(field.apiName))
        .flatMap((field) => field.picklistLabels ?? []),
      formulaFields: (described.fields ?? []).filter((field) => field.formula)
        .length,
      lookups: (described.fields ?? []).flatMap((field) =>
        field.relationshipKind === "lookup" || field.relationshipKind === "master_detail"
          ? [
              {
                field: field.apiName,
                to: field.referenceTo ?? [],
                kind: field.relationshipKind,
              },
            ]
          : [],
      ),
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
    return objectsFromListSummary(summary);
  }

  if (tool === "describe_object") {
    const described = summary as {
      apiName?: string;
      label?: string;
      custom?: boolean;
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
    return {
      apiName: described.apiName ?? apiName ?? "Unknown",
      label: described.label ?? described.apiName ?? apiName ?? "Unknown",
      custom:
        described.custom === true ||
        /__c$/i.test(described.apiName ?? apiName ?? ""),
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
    integrations: null,
    agentforce: null,
    observed: {
      automations: results.some(
        (result) => result.tool === "list_automations" && result.ok,
      ),
      validationRules: results.some(
        (result) => result.tool === "list_validation_rules" && result.ok,
      ),
      process: results.some(
        (result) => result.tool === "list_process_controls" && result.ok,
      ),
      security: results.some(
        (result) => result.tool === "security_summary" && result.ok,
      ),
      knowledge: results.some(
        (result) => result.tool === "knowledge_posture" && result.ok,
      ),
      limits: results.some((result) => result.tool === "org_limits" && result.ok),
      integrations: results.some(
        (result) => result.tool === "get_integration_map" && result.ok,
      ),
      agentforce: results.some(
        (result) => result.tool === "get_agentforce_configuration" && result.ok,
      ),
    },
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
    if (result.tool === "get_integration_map") {
      facts.integrations = result.data as IntegrationMap;
    }
    if (result.tool === "get_agentforce_configuration") {
      facts.agentforce = result.data as AgentforceConfiguration;
    }
  }

  for (const described of Object.values(facts.describes)) {
    if (facts.objects.some((item) => item.apiName === described.apiName)) {
      continue;
    }
    facts.objects.push({
      apiName: described.apiName,
      label: described.label,
      custom: described.custom || /__c$/i.test(described.apiName),
      queryable: true,
    });
  }

  return facts;
}

export function discoveryCoverage(
  results: { tool: string; ok: boolean }[],
) {
  const objectsListed = results.some(
    (result) => result.tool === "list_objects" && result.ok,
  );
  const describes = results.filter((result) => result.tool === "describe_object");
  const describesOk = describes.filter((result) => result.ok).length;
  const describeRatio =
    describes.length === 0 ? 1 : describesOk / describes.length;

  return {
    objectsListed,
    describeCount: describes.length,
    describesOk,
    complete: objectsListed && describeRatio >= 0.6,
  };
}

function objectsFromListSummary(summary: unknown): EnterpriseObject[] {
  const listed = summary as {
    present?: string[];
    customNames?: string[];
  };
  const objects = new Map<string, EnterpriseObject>();

  for (const name of listed.present ?? []) {
    objects.set(name, {
      apiName: name,
      label: labelFromApiName(name),
      custom: /__c$/i.test(name),
      queryable: true,
    });
  }

  for (const named of listed.customNames ?? []) {
    const parsed = parseNamedObject(named);
    if (!parsed) {
      continue;
    }
    objects.set(parsed.apiName, {
      apiName: parsed.apiName,
      label: parsed.label,
      custom: true,
      queryable: true,
    });
  }

  return [...objects.values()];
}

function parseNamedObject(value: string) {
  const match = value.match(/^(.*) \(([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return { label: match[1], apiName: match[2] };
}

function labelFromApiName(apiName: string) {
  return apiName
    .replace(/__c$/i, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
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
