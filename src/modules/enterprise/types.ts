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
  layoutable?: boolean;
  customSetting?: boolean;
};

export type FieldRelationshipKind = "lookup" | "master_detail" | "none";

export type EnterpriseField = {
  apiName: string;
  label: string;
  type: string;
  required: boolean;
  custom: boolean;
  formula?: boolean;
  readOnly?: boolean;
  unique?: boolean;
  externalId?: boolean;
  relationshipKind?: FieldRelationshipKind;
  picklistLabels?: string[];
  referenceTo?: string[];
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

export type AutomationKind =
  | "flow"
  | "apex"
  | "apex_trigger"
  | "workflow"
  | "process_builder"
  | "escalation"
  | "auto_response"
  | "approval";

export type AutomationSummary = {
  kind: AutomationKind;
  name: string;
  namespace: string | null;
  status: string | null;
  size: number | null;
  objectApiName?: string | null;
  objectLabel?: string | null;
  triggerType?: string | null;
  actions?: string[];
  fieldsAffected?: string[];
};

export type ValidationRuleSummary = {
  name: string;
  objectApiName: string;
  active: boolean;
};

export type ObjectSharing = {
  objectApiName: string;
  internal: string | null;
  external: string | null;
};

export type SecuritySummary = {
  profileCount: number;
  permissionSetCount: number;
  permissionSetGroupCount?: number;
  roleCount?: number;
  profileNames?: string[];
  permissionSetNames?: string[];
  permissionSetGroupNames?: string[];
  sharing?: ObjectSharing[];
  objectAccessAvailable?: boolean;
  fieldAccessAvailable?: boolean;
};

export type KnowledgePosture = {
  enabled: boolean;
  articleObjects: string[];
  dataCategories: string[];
  usefulnessKnown?: boolean;
};

export type ProcessRule = {
  name: string;
  objectApiName: string;
  active: boolean;
};

export type ProcessControls = {
  queues: { name: string; objectApiName?: string | null }[];
  assignmentRules: ProcessRule[];
  escalationRules?: ProcessRule[];
  autoResponseRules?: ProcessRule[];
  approvalProcesses?: ProcessRule[];
  businessHours: { name: string; active: boolean }[];
};

export type IntegrationEndpoint = {
  name: string;
  kind: "named_credential" | "connected_app" | "remote_site" | "external_object" | "platform_event";
  host?: string | null;
};

export type IntegrationMap = {
  endpoints: IntegrationEndpoint[];
};

export type AgentforceItem = {
  name: string;
  kind: "agent" | "topic" | "action" | "prompt_template";
};

export type AgentforceConfiguration = {
  available: boolean;
  items: AgentforceItem[];
};

export type InstalledPackage = {
  name: string;
  namespace: string | null;
};

export type OrgLimits = {
  dailyApiRequests: { max: number; remaining: number } | null;
  dataStorageMb: { max: number; remaining: number } | null;
  fileStorageMb: { max: number; remaining: number } | null;
  packages?: InstalledPackage[];
};
