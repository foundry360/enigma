import "server-only";

import type {
  AgentforceConfiguration,
  AutomationSummary,
  EnterpriseObject,
  IntegrationMap,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  ProcessControls,
  ProcessRule,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";
import { salesforceRequest } from "@/modules/connectors/salesforce/http";
import {
  articleCountQuery,
  restQueries,
  salesforcePath,
  toolingQueries,
} from "@/modules/connectors/salesforce/paths";
import {
  instanceKind,
  refreshAccessToken,
  type SalesforceIdentity,
} from "@/modules/connectors/salesforce/oauth";
import { isPlatformSystemField } from "@/modules/enterprise/fields";
import {
  articleCountTargets,
  isArticleSource,
  type ArticleCounts,
} from "@/modules/enterprise/knowledge-sources";
import type { OrgProfile } from "@/modules/enterprise/types";

type SObjectList = {
  sobjects?: {
    name: string;
    label: string;
    custom: boolean;
    queryable: boolean;
    layoutable?: boolean;
    customSetting?: boolean;
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
    calculated?: boolean;
    updateable?: boolean;
    unique?: boolean;
    externalId?: boolean;
    cascadeDelete?: boolean;
    relationshipOrder?: number | null;
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
    layoutable: object.layoutable,
    customSetting: object.customSetting,
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
    fields: (data.fields ?? [])
      .filter((field) => !isPlatformSystemField(field.name))
      .map((field) => ({
      apiName: field.name,
      label: field.label,
      type: field.type,
      required: !field.nillable && !field.defaultedOnCreate,
      custom: field.custom,
      formula: Boolean(field.calculated),
      readOnly: field.updateable === false,
      unique: Boolean(field.unique),
      externalId: Boolean(field.externalId),
      relationshipKind:
        field.type === "reference"
          ? field.cascadeDelete || field.relationshipOrder != null
            ? ("master_detail" as const)
            : ("lookup" as const)
          : ("none" as const),
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
  const [flows, triggers, workflows] = await Promise.all([
    listSalesforceFlows(input),
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
    optionalToolingRecords<{
      Name?: string;
      TableEnumOrId?: string | null;
      Active?: boolean;
    }>(input, toolingQueries.workflowRules),
  ]);

  return [
    ...flows,
    ...(triggers.records ?? []).map((item) => ({
      kind: "apex_trigger" as const,
      name: item.Name ?? "ApexTrigger",
      namespace: item.NamespacePrefix ?? null,
      status: item.Status ?? null,
      size: null,
      objectApiName: objectName(item.TableEnumOrId),
      triggerType: humanizeApexTrigger(item),
      actions: [],
      fieldsAffected: [],
    })),
    ...workflows.map((item) => ({
      kind: "workflow" as const,
      name: item.Name ?? "Workflow",
      namespace: null,
      status: item.Active ? "Active" : "Inactive",
      size: null,
      objectApiName: objectName(item.TableEnumOrId),
      triggerType: null,
      actions: [],
      fieldsAffected: [],
    })),
  ];
}

async function listSalesforceFlows(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<AutomationSummary[]> {
  const views = await optionalRestRecords<{
    ApiName?: string;
    Label?: string;
    ProcessType?: string;
    TriggerType?: string;
    TriggerObjectOrEventLabel?: string;
    IsActive?: boolean;
  }>(input, restQueries.flowDefinitionView);

  if (views.length > 0) {
    return views.map((item) => ({
      kind: flowKind(item.ProcessType),
      name: item.ApiName ?? item.Label ?? "Flow",
      namespace: null,
      status: item.IsActive ? "Active" : "Inactive",
      size: null,
      objectApiName: objectName(item.TriggerObjectOrEventLabel),
      objectLabel: item.TriggerObjectOrEventLabel ?? null,
      triggerType: humanizeFlowTrigger(item.TriggerType, item.ProcessType),
      actions: [],
      fieldsAffected: [],
    }));
  }

  const [definitions, versions] = await Promise.all([
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
  ]);

  const versionById = new Map(
    (versions.records ?? []).map((version) => [version.Id, version]),
  );

  return (definitions.records ?? []).map((definition) => {
    const version = definition.ActiveVersionId
      ? versionById.get(definition.ActiveVersionId)
      : undefined;
    return {
      kind: flowKind(version?.ProcessType),
      name: definition.DeveloperName ?? definition.MasterLabel ?? "Flow",
      namespace: null,
      status: definition.ActiveVersionId ? "Active" : "Inactive",
      size: null,
      objectApiName: null,
      triggerType: humanizeFlowTrigger(version?.TriggerType, version?.ProcessType),
      actions: [],
      fieldsAffected: [],
    };
  });
}

function flowKind(processType?: string): AutomationSummary["kind"] {
  if (
    processType === "Workflow" ||
    processType === "InvocableProcess" ||
    processType === "CustomEvent"
  ) {
    return "process_builder";
  }
  return "flow";
}

function objectName(value?: string | null) {
  if (!value || /^[a-zA-Z0-9]{15,18}$/.test(value)) {
    return null;
  }
  return value;
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
  const [profiles, permissionSets, groups, roles, sharing] = await Promise.all([
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
    optionalRestRecords<{ MasterLabel?: string; DeveloperName?: string }>(
      input,
      restQueries.permissionSetGroups,
    ),
    optionalRestRecords<{ Name?: string }>(input, restQueries.roles),
    optionalToolingRecords<{
      QualifiedApiName?: string;
      InternalSharingModel?: string;
      ExternalSharingModel?: string;
    }>(input, toolingQueries.entitySharing),
  ]);

  const profileNames = uniqueNames(
    (profiles.records ?? []).map((record) => record.Name),
  );
  const permissionSetNames = uniqueNames(
    (permissionSets.records ?? [])
      .filter((record) => !record.IsOwnedByProfile)
      .map((record) => record.Label || record.Name),
  );
  const groupNames = uniqueNames(
    groups.map((item) => item.MasterLabel || item.DeveloperName),
  );

  return {
    profileCount: profiles.totalSize ?? profileNames.length,
    permissionSetCount: permissionSets.totalSize ?? permissionSets.records?.length ?? 0,
    permissionSetGroupCount: groupNames.length,
    roleCount: roles.length,
    profileNames,
    permissionSetNames,
    permissionSetGroupNames: groupNames.slice(0, 20),
    sharing: sharing
      .filter((item) => item.QualifiedApiName && !isNoiseApiName(item.QualifiedApiName))
      .slice(0, 80)
      .map((item) => ({
        objectApiName: item.QualifiedApiName ?? "",
        internal: item.InternalSharingModel ?? null,
        external: item.ExternalSharingModel ?? null,
      })),
    objectAccessAvailable: false,
    fieldAccessAvailable: false,
  };
}

function uniqueNames(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

export async function getSalesforceKnowledgePosture(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<KnowledgePosture> {
  const objects = await optionalSalesforceObjects(input);
  const articleObjects = objects
    .filter((object) => isArticleSource(object.apiName))
    .map((object) => object.apiName);
  const categories = await optionalToolingRecords<{
    DeveloperName?: string;
    MasterLabel?: string;
  }>(input, toolingQueries.dataCategoryGroups);
  const articles = await countKnowledgeArticles(input, objects);

  return {
    enabled: Boolean(articles && articles.published > 0),
    articleObjects,
    dataCategories: uniqueNames(
      categories.map((item) => item.MasterLabel || item.DeveloperName),
    ),
    usefulnessKnown: false,
    articleCountsKnown: articles != null,
    articles: articles ?? undefined,
  };
}

async function optionalSalesforceObjects(input: {
  instanceUrl: string;
  accessToken: string;
}) {
  try {
    return await listSalesforceObjects(input);
  } catch {
    return [];
  }
}

const articleCountFallbacks = ["Knowledge__kav", "KnowledgeArticleVersion"];

async function countKnowledgeArticles(
  input: { instanceUrl: string; accessToken: string },
  objects: EnterpriseObject[],
) {
  const names = objects
    .filter((object) => object.queryable !== false)
    .map((object) => object.apiName);
  const preferred = articleCountTargets(names);
  const counted = await sumArticleCounts(input, preferred);
  if (counted) {
    return counted;
  }

  const fallback = [
    ...names.filter(
      (name) =>
        /^KnowledgeArticleVersion$/i.test(name) && !preferred.includes(name),
    ),
    ...articleCountFallbacks.filter(
      (name) => !preferred.includes(name) && !names.includes(name),
    ),
  ];
  return sumArticleCounts(input, fallback);
}

async function sumArticleCounts(
  input: { instanceUrl: string; accessToken: string },
  apiNames: string[],
) {
  const totals: ArticleCounts = { draft: 0, published: 0, archived: 0 };
  let counted = false;

  for (const apiName of apiNames) {
    const next = await countArticlesOnObjectWithLocale(input, apiName);
    if (!next) {
      continue;
    }

    counted = true;
    totals.draft += next.draft;
    totals.published += next.published;
    totals.archived += next.archived;
  }

  return counted ? totals : null;
}

async function countArticlesOnObject(
  input: { instanceUrl: string; accessToken: string },
  apiName: string,
  language?: string,
): Promise<ArticleCounts | null> {
  const draft = await optionalRestCount(
    input,
    articleCountQuery(apiName, "Draft", language),
  );
  const published = await optionalRestCount(
    input,
    articleCountQuery(apiName, "Online", language),
  );
  const archived = await optionalRestCount(
    input,
    articleCountQuery(apiName, "Archived", language),
  );

  if (draft == null || published == null || archived == null) {
    return null;
  }

  return { draft, published, archived };
}

async function countArticlesOnObjectWithLocale(
  input: { instanceUrl: string; accessToken: string },
  apiName: string,
) {
  const unfiltered = await countArticlesOnObject(input, apiName);
  if (unfiltered) {
    return unfiltered;
  }

  const language = await knowledgeLanguage(input);
  return language ? countArticlesOnObject(input, apiName, language) : null;
}

async function knowledgeLanguage(input: {
  instanceUrl: string;
  accessToken: string;
}) {
  const records = await optionalRestRecords<{ LanguageLocaleKey?: string }>(
    input,
    restQueries.organization,
  );
  const language = records[0]?.LanguageLocaleKey?.trim();
  return language && /^[A-Za-z]{2}(_[A-Za-z]{2,4})?$/.test(language)
    ? language
    : "en_US";
}

export async function listSalesforceProcessControls(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<ProcessControls> {
  const [queues, queueObjects, hours, assignment, escalation, autoResponse, approvals] =
    await Promise.all([
      optionalRestRecords<{ Id?: string; Name?: string; DeveloperName?: string }>(
        input,
        restQueries.queues,
      ),
      optionalRestRecords<{ QueueId?: string; SobjectType?: string }>(
        input,
        restQueries.queueObjects,
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
      optionalToolingRecords<{
        Name?: string;
        SobjectType?: string;
        Active?: boolean;
      }>(input, toolingQueries.escalationRules),
      optionalToolingRecords<{
        Name?: string;
        SobjectType?: string;
        Active?: boolean;
      }>(input, toolingQueries.autoResponseRules),
      optionalToolingRecords<{
        Name?: string;
        TableEnumOrId?: string;
        State?: string;
      }>(input, toolingQueries.approvalProcesses),
    ]);

  const objectsByQueue = new Map<string, string>();
  for (const item of queueObjects) {
    if (item.QueueId && item.SobjectType && !objectsByQueue.has(item.QueueId)) {
      objectsByQueue.set(item.QueueId, item.SobjectType);
    }
  }

  return {
    queues: queues.map((item) => ({
      name: item.Name || item.DeveloperName || "Queue",
      objectApiName: item.Id ? objectsByQueue.get(item.Id) ?? null : null,
    })),
    assignmentRules: toProcessRules(assignment),
    escalationRules: toProcessRules(escalation),
    autoResponseRules: toProcessRules(autoResponse),
    approvalProcesses: approvals.map((item) => ({
      name: item.Name ?? "Approval process",
      objectApiName: objectName(item.TableEnumOrId) ?? "Unknown",
      active: /active/i.test(item.State ?? ""),
    })),
    businessHours: hours.map((item) => ({
      name: item.Name ?? "Business hours",
      active: item.IsActive !== false,
    })),
  };
}

function toProcessRules(
  rules: { Name?: string; SobjectType?: string; Active?: boolean }[],
): ProcessRule[] {
  return rules.map((rule) => ({
    name: rule.Name ?? "Rule",
    objectApiName: rule.SobjectType ?? "Unknown",
    active: Boolean(rule.Active),
  }));
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

  const packages = await optionalToolingRecords<{
    SubscriberPackage?: { Name?: string; NamespacePrefix?: string | null };
  }>(input, toolingQueries.installedPackages);

  return {
    dailyApiRequests: readLimit(limits.DailyApiRequests),
    dataStorageMb: readLimit(limits.DataStorageMB),
    fileStorageMb: readLimit(limits.FileStorageMB),
    packages: packages
      .map((item) => ({
        name: item.SubscriberPackage?.Name ?? "Package",
        namespace: item.SubscriberPackage?.NamespacePrefix ?? null,
      }))
      .filter((item) => item.name !== "Package")
      .slice(0, 30),
  };
}

export async function getSalesforceIntegrationMap(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<IntegrationMap> {
  const objects = await listSalesforceObjects(input);
  const [credentials, remoteSites, connectedApps] = await Promise.all([
    optionalRestRecords<{
      DeveloperName?: string;
      MasterLabel?: string;
      Endpoint?: string;
    }>(input, restQueries.namedCredentials),
    optionalRestRecords<{ SiteName?: string; EndpointUrl?: string }>(
      input,
      restQueries.remoteSites,
    ),
    optionalToolingRecords<{ Name?: string }>(
      input,
      toolingQueries.connectedApplications,
    ),
  ]);

  return {
    endpoints: [
      ...credentials.map((item) => ({
        name: item.MasterLabel || item.DeveloperName || "Named credential",
        kind: "named_credential" as const,
        host: endpointHost(item.Endpoint),
      })),
      ...connectedApps.map((item) => ({
        name: item.Name ?? "Connected app",
        kind: "connected_app" as const,
        host: null,
      })),
      ...remoteSites.map((item) => ({
        name: item.SiteName ?? "Remote site",
        kind: "remote_site" as const,
        host: endpointHost(item.EndpointUrl),
      })),
      ...objects
        .filter((item) => /__x$/i.test(item.apiName))
        .map((item) => ({
          name: item.label,
          kind: "external_object" as const,
          host: null,
        })),
      ...objects
        .filter((item) => /__e$/i.test(item.apiName))
        .map((item) => ({
          name: item.label,
          kind: "platform_event" as const,
          host: null,
        })),
    ].slice(0, 80),
  };
}

export async function getSalesforceAgentforceConfiguration(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<AgentforceConfiguration> {
  const [bots, prompts, functions] = await Promise.all([
    optionalRestRecords<{
      DeveloperName?: string;
      MasterLabel?: string;
      BotType?: string;
    }>(input, restQueries.botDefinitions),
    optionalToolingRecords<{ DeveloperName?: string; MasterLabel?: string }>(
      input,
      toolingQueries.genAiPromptTemplates,
    ),
    optionalToolingRecords<{ DeveloperName?: string; MasterLabel?: string }>(
      input,
      toolingQueries.genAiFunctions,
    ),
  ]);

  const items = [
    ...bots.map((item) => ({
      name: item.MasterLabel || item.DeveloperName || "Agent",
      kind: "agent" as const,
    })),
    ...prompts.map((item) => ({
      name: item.MasterLabel || item.DeveloperName || "Prompt template",
      kind: "prompt_template" as const,
    })),
    ...functions.map((item) => ({
      name: item.MasterLabel || item.DeveloperName || "Action",
      kind: "action" as const,
    })),
  ].slice(0, 40);

  return {
    available: true,
    items,
  };
}

function endpointHost(value?: string | null) {
  if (!value) {
    return null;
  }
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

function isNoiseApiName(apiName: string) {
  return /__(Share|History|Feed|Tag|ChangeEvent|hd|x|b|e|mdt)$|(Share|History|Feed|ChangeEvent)$/i.test(
    apiName,
  );
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

async function optionalRestCount(
  input: { instanceUrl: string; accessToken: string },
  query: string,
) {
  try {
    const data = await salesforceRequest<ToolingCount>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("query", query),
    });
    return data.totalSize;
  } catch {
    return null;
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
