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

export type IntelligenceFinding = {
  id: string;
  domain: IntelligenceDomain;
  title: string;
  summary: string;
  evidence: Evidence[];
  confidence: FindingConfidence;
  provenance: Provenance;
  businessImplication: string;
  consumptionImplication?: string;
  deploymentImplication?: string;
  nextAction: string;
  relatedSignals: SignalKey[];
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
  userPopulation: { value: number | null; basis: VolumeBasis };
};

export type WorkObjectInsight = {
  apiName: string;
  label: string;
  kind: WorkKind | "supporting" | "unknown";
  role: "primary" | "secondary" | "context";
  volume: { value: number | null; basis: VolumeBasis };
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

export type ProcessInsight = {
  observedPaths: ProcessPath[];
  inferredPaths: ProcessPath[];
  assignment: string[];
  hours: string[];
};

export type DataObjectInsight = {
  label: string;
  fieldCount: number;
  requiredCount: number;
  qualityAvailable: boolean;
};

export type DataInsight = {
  objects: DataObjectInsight[];
  qualityAvailable: boolean;
  qualityGap: string | null;
};

export type KnowledgeInsight = {
  enabled: boolean;
  sources: string[];
  categories: string[];
  coverageKnown: boolean;
  freshnessKnown: boolean;
};

export type AutomationInsight = {
  total: number;
  active: number;
  named: string[];
  objectsTouched: string[];
};

export type AccessInsight = {
  profileCount: number | null;
  permissionSetCount: number | null;
  namedProfiles: string[];
  isolation: "unknown" | "focused" | "sprawling";
};

export type IntegrationInsight = {
  observed: string[];
  available: boolean;
  gap: string | null;
};

export type PlatformInsight = {
  constraints: {
    title: string;
    detail: string;
    affects: ("opportunity" | "deployment" | "consumption" | "scale" | "risk")[];
  }[];
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
  environment: EnvironmentProfile;
  workload: WorkloadInsight;
  process: ProcessInsight;
  data: DataInsight;
  knowledge: KnowledgeInsight;
  automation: AutomationInsight;
  access: AccessInsight;
  integration: IntegrationInsight;
  platform: PlatformInsight;
  findings: IntelligenceFinding[];
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
  platform: "Platform constraints",
};
