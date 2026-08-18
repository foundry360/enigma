import "server-only";

import type {
  AutomationSummary,
  EnterpriseObject,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";
import { salesforceRequest } from "@/modules/connectors/salesforce/http";
import {
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
  const [flows, apex] = await Promise.all([
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
        Name?: string;
        NamespacePrefix?: string | null;
        LengthWithoutComments?: number;
        Status?: string;
      }>
    >({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.apexClasses),
    }),
  ]);

  return [
    ...(flows.records ?? []).map((flow) => ({
      kind: "flow" as const,
      name: flow.DeveloperName ?? flow.MasterLabel ?? "Flow",
      namespace: null,
      status: flow.ActiveVersionId ? "Active" : "Inactive",
      size: null,
    })),
    ...(apex.records ?? []).map((item) => ({
      kind: "apex" as const,
      name: item.Name ?? "ApexClass",
      namespace: item.NamespacePrefix ?? null,
      status: item.Status ?? null,
      size: item.LengthWithoutComments ?? null,
    })),
  ];
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
    salesforceRequest<ToolingCount>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.profileCount),
    }),
    salesforceRequest<ToolingCount>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("tooling", toolingQueries.permissionSetCount),
    }),
  ]);

  return {
    profileCount: profiles.totalSize ?? 0,
    permissionSetCount: permissionSets.totalSize ?? 0,
  };
}

export async function getSalesforceKnowledgePosture(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<KnowledgePosture> {
  const objects = await listSalesforceObjects(input);
  const articleObjects = objects
    .filter((object) => /knowledge|ka__kav|kav$/i.test(object.apiName))
    .map((object) => object.apiName);

  return {
    enabled: articleObjects.length > 0,
    articleObjects,
    dataCategories: [],
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
    dailyApiRequests: limits.DailyApiRequests
      ? {
          max: limits.DailyApiRequests.Max,
          remaining: limits.DailyApiRequests.Remaining,
        }
      : null,
  };
}
