import type { Evidence, SignalKey, WorkKind } from "@/modules/intelligence/types";

export const intelligenceDomains = [
  "environment",
  "workload",
  "process",
  "data",
  "knowledge",
  "automation",
  "access",
  "integration",
  "agentforce",
  "platform",
] as const;

export type IntelligenceDomain = (typeof intelligenceDomains)[number];

export type Provenance =
  | "observed"
  | "inferred"
  | "customer_input"
  | "calculated"
  | "unknown";

export type FindingConfidence = "high" | "medium" | "low";

export type VolumeBasis =
  | "observed"
  | "estimated"
  | "customer_provided"
  | "derived"
  | "unknown";

export type FindingStatus = "observed" | "inferred" | "unknown";

export type IntelligenceFinding = {
  id: string;
  domain: IntelligenceDomain;
  title: string;
  summary: string;
  observation?: string;
  implication?: string;
  evidence: Evidence[];
  evidenceIds?: string[];
  confidence: FindingConfidence;
  provenance: Provenance;
  status?: FindingStatus;
  businessImplication: string;
  consumptionImplication?: string;
  deploymentImplication?: string;
  nextAction: string;
  relatedSignals: SignalKey[];
};

export type IntelligenceGap = {
  id: string;
  domain: IntelligenceDomain;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  evidenceNeeded?: string;
  relatedSignals?: SignalKey[];
};

export type EvidenceRecord = Evidence & {
  id: string;
};

export type EnvironmentProfile = {
  platform: string;
  edition: string | null;
  instanceKind: "production" | "sandbox" | "unknown";
  orgName: string | null;
  orgId: string | null;
  connectionStatus: string | null;
  objectCount: number | null;
  customObjectCount: number | null;
  customObjectNames: string[];
  inventoryObjectNames: string[];
  userPopulation: { value: number | null; basis: VolumeBasis };
  automationCount?: number | null;
  activeAutomationCount?: number | null;
  profileCount?: number | null;
  permissionSetCount?: number | null;
  knowledgePosture?: "present" | "unpublished" | "absent" | "unknown";
  integrationPosture?: "present" | "absent" | "unknown";
  agentforcePosture?: "present" | "absent" | "unknown";
};

export type WorkObjectInsight = {
  apiName: string;
  label: string;
  kind: WorkKind | "supporting" | "unknown";
  role: "primary" | "secondary" | "context";
  custom?: boolean;
  fieldCount?: number;
  customFieldCount?: number;
  requiredCount?: number;
  hasLifecycle?: boolean;
  usedInModel?: boolean;
  recordTypes?: string[];
  relatedObjects?: string[];
  relatedActivity?: string[];
  volume: {
    value: number | null;
    basis: VolumeBasis;
    status?: "observed" | "unknown";
  };
};

export type WorkloadInsight = {
  primary: WorkObjectInsight[];
  secondary: WorkObjectInsight[];
  context: WorkObjectInsight[];
  volumeAvailable: boolean;
  volumeGap: string | null;
};

export type ProcessPath = {
  objectLabel: string;
  stages: string[];
  provenance: Provenance;
  confidence: FindingConfidence;
};

export type ProcessStepKind =
  | "entry"
  | "work"
  | "assignment"
  | "activity"
  | "escalation"
  | "resolution";

export type ProcessStep = {
  stage: ProcessStepKind;
  label: string;
  provenance: Provenance;
};

export type ProcessInsight = {
  observedPaths: ProcessPath[];
  inferredPaths: ProcessPath[];
  assignment: string[];
  hours: string[];
  path: ProcessStep[];
  escalation: string[];
  approvals: string[];
};

export type DataRelationship = {
  fromLabel: string;
  toLabel: string;
  kind: "lookup" | "master_detail";
};

export type DataObjectInsight = {
  label: string;
  apiName?: string;
  fieldCount: number;
  requiredCount: number;
  formulaCount: number;
  uniqueCount: number;
  externalIdCount: number;
  relationshipCount: number;
  writableCount?: number;
  readOnlyCount?: number;
  picklistCount?: number;
  qualityAvailable: boolean;
};

export type DataInsight = {
  objects: DataObjectInsight[];
  relationships: DataRelationship[];
  qualityAvailable: boolean;
  qualityGap: string | null;
};

export type KnowledgeInsight = {
  enabled: boolean;
  sources: string[];
  categories: string[];
  coverageKnown: boolean;
  freshnessKnown: boolean;
  usefulnessKnown: boolean;
  articleCountsKnown: boolean;
  draftCount: number | null;
  publishedCount: number | null;
  archivedCount: number | null;
};

export type AutomationBinding = {
  objectLabel: string;
  objectApiName: string | null;
  name: string;
  kind: string;
  trigger: string | null;
  actions: string[];
  fieldsAffected: string[];
};

export type AutomationInsight = {
  total: number;
  active: number;
  named: string[];
  objectsTouched: string[];
  map: AutomationBinding[];
  actionsKnown: boolean;
};

export type AccessInsight = {
  profileCount: number | null;
  permissionSetCount: number | null;
  permissionSetGroupCount: number | null;
  roleCount: number | null;
  namedProfiles: string[];
  isolation: "unknown" | "focused" | "sprawling";
  sharing: { objectLabel: string; internal: string | null }[];
  objectAccessAvailable: boolean;
  fieldAccessAvailable: boolean;
};

export type IntegrationInsight = {
  observed: string[];
  available: boolean;
  gap: string | null;
};

export type AgentforceInsight = {
  available: boolean;
  existing: string[];
  netNew: boolean | null;
};

export type PlatformInsight = {
  constraints: {
    title: string;
    detail: string;
    affects: ("opportunity" | "deployment" | "consumption" | "scale" | "risk")[];
  }[];
  packages: string[];
};

export type OrgIntelligenceSummary = {
  learned: string[];
  notObserved: string[];
  meaning: string;
  constraints: string[];
  strongestOpportunity: string | null;
  nextStep: string;
};

export type OrgIntelligence = {
  version: 1;
  runId?: string | null;
  environment: EnvironmentProfile;
  workload: WorkloadInsight;
  process: ProcessInsight;
  data: DataInsight;
  knowledge: KnowledgeInsight;
  automation: AutomationInsight;
  access: AccessInsight;
  integration: IntegrationInsight;
  agentforce?: AgentforceInsight;
  platform: PlatformInsight;
  findings: IntelligenceFinding[];
  gaps?: IntelligenceGap[];
  evidence?: EvidenceRecord[];
  summary: OrgIntelligenceSummary;
};

export const domainTitles: Record<IntelligenceDomain, string> = {
  environment: "Environment",
  workload: "Workload",
  process: "Process",
  data: "Data",
  knowledge: "Knowledge",
  automation: "Automation",
  access: "Access and security",
  integration: "Integrations",
  agentforce: "Existing AI",
  platform: "Platform constraints",
};
