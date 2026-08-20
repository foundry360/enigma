import "server-only";

import type {
  AutomationSummary,
  EnterpriseObject,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  ProcessControls,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";
import { salesforceRequest } from "@/modules/connectors/salesforce/http";
import {
  restQueries,
  salesforcePath,
  toolingQueries,
} from "@/modules/connectors/salesforce/paths";
import {
  instanceKind,
  refreshAccessToken,
  type SalesforceIdentity,
} from "@/modules/connectors/salesforce/oauth";
import type { OrgProfile } from "@/modules/enterprise/types";

type SObjectList = {
  sobjects?: {
    name: string;
    label: string;
    custom: boolean;
    queryable: boolean;
  }[];
};

type SObjectDescribe = {
  name: string;
  label: string;
  custom: boolean;
  fields?: {
    name: string;
    label: string;
    type: string;
    nillable: boolean;
    defaultedOnCreate: boolean;
    custom: boolean;
    picklistValues?: { active?: boolean; label?: string; value?: string }[];
    referenceTo?: string[];
  }[];
  recordTypeInfos?: {
    developerName: string;
    name: string;
    active: boolean;
  }[];
};

type ToolingCount = { totalSize: number };

type ToolingRecords<T> = { records?: T[] };

type LimitsResponse = {
  DailyApiRequests?: { Max: number; Remaining: number };
  DataStorageMB?: { Max: number; Remaining: number };
  FileStorageMB?: { Max: number; Remaining: number };
};

export function mapSalesforceOrgProfile(
  identity: SalesforceIdentity,
  instanceUrl: string | null,
): OrgProfile {
  return {
    metadataType: "Organization",
    name: identity.organization_name,
    orgId: identity.organization_id,
    organizationType: identity.organization_type,
    instanceKind:
      identity.is_sandbox === true
        ? "sandbox"
        : identity.is_sandbox === false
          ? "production"
          : instanceKind(instanceUrl),
    instanceName: identity.instance_name,
    namespacePrefix: identity.namespace_prefix,
    createdAt: identity.created_at,
    createdBy: identity.created_by,
    lastModifiedAt: identity.last_modified_at,
    lastModifiedBy: identity.last_modified_by,
    locale: identity.locale,
    language: identity.language,
    timeZone: identity.time_zone,
  };
}

export async function withSalesforceAccess<T>(input: {
  instanceUrl: string;
  refreshToken: string;
  onRotatedRefreshToken?: (refreshToken: string) => Promise<void>;
  run: (accessToken: string) => Promise<T>;
}) {
  const tokens = await refreshAccessToken({
    instanceUrl: input.instanceUrl,
    refreshToken: input.refreshToken,
  });

  if (tokens.refresh_token) {
    await input.onRotatedRefreshToken?.(tokens.refresh_token);
  }

  return input.run(tokens.access_token);
}

export async function listSalesforceObjects(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<EnterpriseObject[]> {
  const data = await salesforceRequest<SObjectList>({
    instanceUrl: input.instanceUrl,
    accessToken: input.accessToken,
    path: salesforcePath("sobjects"),
  });

  return (data.sobjects ?? []).map((object) => ({
    apiName: object.name,
    label: object.label,
    custom: object.custom,
    queryable: object.queryable,
  }));
}

export async function describeSalesforceObject(input: {
  instanceUrl: string;
  accessToken: string;
  apiName: string;
}): Promise<ObjectDescribe> {
  const data = await salesforceRequest<SObjectDescribe>({
    instanceUrl: input.instanceUrl,
    accessToken: input.accessToken,
    path: salesforcePath("describe", input.apiName),
  });

  return {
    apiName: data.name,
    label: data.label,
    custom: data.custom,
    fields: (data.fields ?? []).map((field) => ({
      apiName: field.name,
      label: field.label,
      type: field.type,
      required: !field.nillable && !field.defaultedOnCreate,
      custom: field.custom,
      picklistLabels: picklistLabels(field),
      referenceTo: field.referenceTo?.filter(Boolean),
    })),
    recordTypes: (data.recordTypeInfos ?? []).map((recordType) => ({
      developerName: recordType.developerName,
      label: recordType.name,
      active: recordType.active,
    })),
  };
}

export async function listSalesforceAutomations(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<AutomationSummary[]> {
  const [definitions, versions, triggers] = await Promise.all([
    salesforceRequest<
      ToolingRecords<{
        DeveloperName?: string;
        MasterLabel?: string;
        ActiveVersionId?: string | null;
      }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.flowDefinitions),
    }),
    salesforceRequest<
      ToolingRecords<{
        Id?: string;
        MasterLabel?: string;
        Status?: string;
        ProcessType?: string;
        TriggerType?: string;
      }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.activeFlows),
    }),
    salesforceRequest<
      ToolingRecords<{
        Name?: string;
        TableEnumOrId?: string | null;
        Status?: string;
        NamespacePrefix?: string | null;
        UsageBeforeInsert?: boolean;
        UsageAfterInsert?: boolean;
        UsageBeforeUpdate?: boolean;
        UsageAfterUpdate?: boolean;
        UsageBeforeDelete?: boolean;
        UsageAfterDelete?: boolean;
      }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.apexTriggers),
    }),
  ]);

  const versionById = new Map(
    (versions.records ?? []).map((version) => [version.Id, version]),
  );

  return [
    ...(definitions.records ?? []).map((definition) => {
      const version = definition.ActiveVersionId
        ? versionById.get(definition.ActiveVersionId)
        : undefined;
      return {
        kind: "flow" as const,
        name: definition.DeveloperName ?? definition.MasterLabel ?? "Flow",
        namespace: null,
        status: definition.ActiveVersionId ? "Active" : "Inactive",
        size: null,
        objectApiName: null,
        triggerType: humanizeFlowTrigger(
          version?.TriggerType,
          version?.ProcessType,
        ),
      };
    }),
    ...(triggers.records ?? []).map((item) => ({
      kind: "apex_trigger" as const,
      name: item.Name ?? "ApexTrigger",
      namespace: item.NamespacePrefix ?? null,
      status: item.Status ?? null,
      size: null,
      objectApiName: item.TableEnumOrId ?? null,
      triggerType: humanizeApexTrigger(item),
    })),
  ];
}

function humanizeFlowTrigger(triggerType?: string, processType?: string) {
  const labels: Record<string, string> = {
    RecordAfterSave: "after save",
    RecordBeforeSave: "before save",
    RecordBeforeDelete: "before delete",
    Scheduled: "scheduled",
    PlatformEvent: "platform event",
    Capability: "capability",
  };
  if (triggerType && labels[triggerType]) {
    return labels[triggerType];
  }
  if (triggerType) {
    return triggerType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  }
  if (processType && processType !== "AutoLaunchedFlow" && processType !== "Flow") {
    return processType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  }
  return null;
}

function humanizeApexTrigger(item: {
  UsageBeforeInsert?: boolean;
  UsageAfterInsert?: boolean;
  UsageBeforeUpdate?: boolean;
  UsageAfterUpdate?: boolean;
  UsageBeforeDelete?: boolean;
  UsageAfterDelete?: boolean;
}) {
  const events = [
    item.UsageBeforeInsert ? "before insert" : null,
    item.UsageAfterInsert ? "after insert" : null,
    item.UsageBeforeUpdate ? "before update" : null,
    item.UsageAfterUpdate ? "after update" : null,
    item.UsageBeforeDelete ? "before delete" : null,
    item.UsageAfterDelete ? "after delete" : null,
  ].filter((event): event is string => Boolean(event));

  return events.length > 0 ? events.join(", ") : null;
}

export async function listSalesforceValidationRules(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<ValidationRuleSummary[]> {
  const data = await salesforceRequest<
    ToolingRecords<{
      ValidationName?: string;
      Active?: boolean;
      EntityDefinition?: { QualifiedApiName?: string };
    }>
  >({
    instanceUrl: input.instanceUrl,
    accessToken: input.accessToken,
    path: salesforcePath("tooling", toolingQueries.validationRules),
  });

  return (data.records ?? []).map((rule) => ({
    name: rule.ValidationName ?? "ValidationRule",
    objectApiName: rule.EntityDefinition?.QualifiedApiName ?? "Unknown",
    active: Boolean(rule.Active),
  }));
}

export async function getSalesforceSecuritySummary(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<SecuritySummary> {
  const [profiles, permissionSets] = await Promise.all([
    salesforceRequest<
      ToolingCount & ToolingRecords<{ Name?: string }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.profiles),
    }),
    salesforceRequest<
      ToolingCount &
        ToolingRecords<{
          Name?: string;
          Label?: string;
          IsOwnedByProfile?: boolean;
        }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.permissionSets),
    }),
  ]);

  const profileNames = uniqueNames(
    (profiles.records ?? []).map((record) => record.Name),
  );
  const permissionSetNames = uniqueNames(
    (permissionSets.records ?? [])
      .filter((record) => !record.IsOwnedByProfile)
      .map((record) => record.Label || record.Name),
  );

  return {
    profileCount: profiles.totalSize ?? profileNames.length,
    permissionSetCount: permissionSets.totalSize ?? permissionSets.records?.length ?? 0,
    profileNames,
    permissionSetNames,
  };
}

function uniqueNames(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

export async function getSalesforceKnowledgePosture(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<KnowledgePosture> {
  const objects = await listSalesforceObjects(input);
  const articleObjects = objects
    .filter((object) => /knowledge|ka__kav|kav$/i.test(object.apiName))
    .map((object) => object.apiName);
  const categories = await optionalToolingRecords<{
    DeveloperName?: string;
    MasterLabel?: string;
  }>(input, toolingQueries.dataCategoryGroups);

  return {
    enabled: articleObjects.length > 0,
    articleObjects,
    dataCategories: uniqueNames(
      categories.map((item) => item.MasterLabel || item.DeveloperName),
    ),
  };
}

export async function listSalesforceProcessControls(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<ProcessControls> {
  const [queues, hours, rules] = await Promise.all([
    optionalRestRecords<{ Name?: string; DeveloperName?: string }>(
      input,
      restQueries.queues,
    ),
    optionalRestRecords<{ Name?: string; IsActive?: boolean }>(
      input,
      restQueries.businessHours,
    ),
    optionalToolingRecords<{
      Name?: string;
      SobjectType?: string;
      Active?: boolean;
    }>(input, toolingQueries.assignmentRules),
  ]);

  return {
    queues: uniqueNames(queues.map((item) => item.Name || item.DeveloperName)).map(
      (name) => ({ name }),
    ),
    assignmentRules: rules.map((rule) => ({
      name: rule.Name ?? "Assignment rule",
      objectApiName: rule.SobjectType ?? "Unknown",
      active: Boolean(rule.Active),
    })),
    businessHours: hours.map((item) => ({
      name: item.Name ?? "Business hours",
      active: item.IsActive !== false,
    })),
  };
}

export async function getSalesforceOrgLimits(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<OrgLimits> {
  const limits = await salesforceRequest<LimitsResponse>({
    instanceUrl: input.instanceUrl,
    accessToken: input.accessToken,
    path: salesforcePath("limits"),
  });

  return {
    dailyApiRequests: readLimit(limits.DailyApiRequests),
    dataStorageMb: readLimit(limits.DataStorageMB),
    fileStorageMb: readLimit(limits.FileStorageMB),
  };
}

function picklistLabels(field: NonNullable<SObjectDescribe["fields"]>[number]) {
  if (!/picklist|multipicklist/i.test(field.type)) {
    return undefined;
  }

  const labels = uniqueNames(
    (field.picklistValues ?? [])
      .filter((value) => value.active !== false)
      .map((value) => value.label || value.value),
  );
  return labels.length > 0 ? labels.slice(0, 40) : undefined;
}

function readLimit(value?: { Max: number; Remaining: number }) {
  return value
    ? { max: value.Max, remaining: value.Remaining }
    : null;
}

async function optionalToolingRecords<T>(
  input: { instanceUrl: string; accessToken: string },
  query: string,
) {
  try {
    const data = await salesforceRequest<ToolingRecords<T>>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", query),
    });
    return data.records ?? [];
  } catch {
    return [];
  }
}

async function optionalRestRecords<T>(
  input: { instanceUrl: string; accessToken: string },
  query: string,
) {
  try {
    const data = await salesforceRequest<ToolingRecords<T>>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("query", query),
    });
    return data.records ?? [];
  } catch {
    return [];
  }
}
