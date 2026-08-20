const API_VERSION = "v61.0";

const objectNamePattern = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;

const allowedExactPaths = new Set([
  "/services/oauth2/userinfo",
  "/services/oauth2/token",
  "/services/oauth2/revoke",
  `/services/data/${API_VERSION}/sobjects/`,
  `/services/data/${API_VERSION}/limits`,
]);

export const restQueries = {
  organization:
    "SELECT Id, Name, OrganizationType, IsSandbox, InstanceName, NamespacePrefix, CreatedDate, CreatedBy.Name, LastModifiedDate, LastModifiedBy.Name, DefaultLocaleSidKey, LanguageLocaleKey, TimeZoneSidKey FROM Organization LIMIT 1",
  queues:
    "SELECT Id, Name, DeveloperName FROM Group WHERE Type = 'Queue' ORDER BY Name",
  queueObjects: "SELECT QueueId, SobjectType FROM QueueSobject",
  businessHours: "SELECT Name, IsActive FROM BusinessHours ORDER BY Name",
  flowDefinitionView:
    "SELECT ApiName, Label, ProcessType, TriggerType, TriggerObjectOrEventLabel, IsActive FROM FlowDefinitionView",
  roles: "SELECT Name FROM UserRole",
  permissionSetGroups:
    "SELECT MasterLabel, DeveloperName FROM PermissionSetGroup",
  namedCredentials: "SELECT DeveloperName, MasterLabel, Endpoint FROM NamedCredential",
  remoteSites: "SELECT SiteName, EndpointUrl FROM RemoteProxy",
  botDefinitions: "SELECT DeveloperName, MasterLabel, BotType FROM BotDefinition",
} as const;

export const toolingQueries = {
  profiles: "SELECT Name FROM Profile ORDER BY Name",
  permissionSets:
    "SELECT Name, Label, IsOwnedByProfile FROM PermissionSet ORDER BY Name",
  dataCategoryGroups:
    "SELECT DeveloperName, MasterLabel FROM DataCategoryGroup ORDER BY MasterLabel",
  assignmentRules: "SELECT Name, SobjectType, Active FROM AssignmentRule",
  escalationRules: "SELECT Name, SobjectType, Active FROM EscalationRule",
  autoResponseRules: "SELECT Name, SobjectType, Active FROM AutoResponseRule",
  approvalProcesses:
    "SELECT Name, TableEnumOrId, State, Type FROM ProcessDefinition WHERE Type = 'Approval'",
  workflowRules: "SELECT Name, TableEnumOrId, Active FROM WorkflowRule",
  flowDefinitions:
    "SELECT Id, DeveloperName, MasterLabel, ActiveVersionId FROM FlowDefinition",
  activeFlows:
    "SELECT Id, MasterLabel, Status, ProcessType, TriggerType FROM Flow WHERE Status = 'Active'",
  apexTriggers:
    "SELECT Name, TableEnumOrId, Status, NamespacePrefix, UsageBeforeInsert, UsageAfterInsert, UsageBeforeUpdate, UsageAfterUpdate, UsageBeforeDelete, UsageAfterDelete FROM ApexTrigger",
  validationRules:
    "SELECT Id, ValidationName, Active, EntityDefinition.QualifiedApiName FROM ValidationRule",
  entitySharing:
    "SELECT QualifiedApiName, InternalSharingModel, ExternalSharingModel FROM EntityDefinition WHERE IsQueryable = true AND IsCustomizable = true",
  connectedApplications: "SELECT Name FROM ConnectedApplication",
  installedPackages:
    "SELECT SubscriberPackage.Name, SubscriberPackage.NamespacePrefix FROM InstalledSubscriberPackage",
  genAiPromptTemplates:
    "SELECT DeveloperName, MasterLabel FROM GenAiPromptTemplate",
  genAiFunctions: "SELECT DeveloperName, MasterLabel FROM GenAiFunction",
} as const;

export function assertSafeObjectApiName(apiName: string) {
  if (!objectNamePattern.test(apiName)) {
    throw new Error("Invalid Salesforce object API name.");
  }

  return apiName;
}

export function salesforcePath(
  kind:
    | "userinfo"
    | "token"
    | "revoke"
    | "sobjects"
    | "limits"
    | "describe"
    | "query"
    | "tooling",
  extra?: string,
) {
  if (kind === "userinfo") {
    return "/services/oauth2/userinfo";
  }
  if (kind === "token") {
    return "/services/oauth2/token";
  }
  if (kind === "revoke") {
    return "/services/oauth2/revoke";
  }
  if (kind === "sobjects") {
    return `/services/data/${API_VERSION}/sobjects/`;
  }
  if (kind === "limits") {
    return `/services/data/${API_VERSION}/limits`;
  }
  if (kind === "describe") {
    const name = assertSafeObjectApiName(extra ?? "");
    return `/services/data/${API_VERSION}/sobjects/${name}/describe`;
  }

  const query = extra ?? "";
  const allowed =
    kind === "query"
      ? (Object.values(restQueries) as string[])
      : (Object.values(toolingQueries) as string[]);

  if (!allowed.includes(query)) {
    throw new Error(
      kind === "query"
        ? "Salesforce query is not allowlisted."
        : "Salesforce Tooling query is not allowlisted.",
    );
  }

  const prefix =
    kind === "query"
      ? `/services/data/${API_VERSION}/query`
      : `/services/data/${API_VERSION}/tooling/query`;

  return `${prefix}?q=${encodeURIComponent(query)}`;
}

export function assertAllowedSalesforcePath(pathWithSearch: string) {
  const [pathname, search = ""] = pathWithSearch.split("?");

  if (allowedExactPaths.has(pathname) && !search) {
    return;
  }

  if (
    new RegExp(
      `^/services/data/${API_VERSION}/sobjects/[A-Za-z][A-Za-z0-9_]{0,79}/describe$`,
    ).test(pathname) &&
    !search
  ) {
    return;
  }

  const query = new URLSearchParams(search).get("q");

  if (
    pathname === `/services/data/${API_VERSION}/query` &&
    query &&
    (Object.values(restQueries) as string[]).includes(query)
  ) {
    return;
  }

  if (
    pathname === `/services/data/${API_VERSION}/tooling/query` &&
    query &&
    (Object.values(toolingQueries) as string[]).includes(query)
  ) {
    return;
  }

  throw new Error("Salesforce path is not allowlisted.");
}
