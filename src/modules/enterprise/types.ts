export type OrgProfile = {
  metadataType: "Organization";
  name: string | null;
  orgId: string | null;
  organizationType: string | null;
  instanceKind: "production" | "sandbox" | "unknown";
  instanceName: string | null;
  namespacePrefix: string | null;
  createdAt: string | null;
  createdBy: string | null;
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
  locale: string | null;
  language: string | null;
  timeZone: string | null;
};

export type ConnectionIdentity = {
  connectionId: string;
  organizationId: string;
  platformType: "SALESFORCE";
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  externalOrgId: string | null;
  externalOrgName: string | null;
  instanceKind: "production" | "sandbox" | "unknown";
  org: OrgProfile | null;
};

export type EnterpriseObject = {
  apiName: string;
  label: string;
  custom: boolean;
  queryable: boolean;
};

export type EnterpriseField = {
  apiName: string;
  label: string;
  type: string;
  required: boolean;
  custom: boolean;
};

export type EnterpriseRecordType = {
  developerName: string;
  label: string;
  active: boolean;
};

export type ObjectDescribe = {
  apiName: string;
  label: string;
  custom: boolean;
  fields: EnterpriseField[];
  recordTypes: EnterpriseRecordType[];
};

export type AutomationSummary = {
  kind: "flow" | "apex";
  name: string;
  namespace: string | null;
  status: string | null;
  size: number | null;
};

export type ValidationRuleSummary = {
  name: string;
  objectApiName: string;
  active: boolean;
};

export type SecuritySummary = {
  profileCount: number;
  permissionSetCount: number;
};

export type KnowledgePosture = {
  enabled: boolean;
  articleObjects: string[];
  dataCategories: string[];
};

export type OrgLimits = {
  dailyApiRequests: { max: number; remaining: number } | null;
};
