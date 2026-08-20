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

export const signalKeys = [
  "addressable_work",
  "operating_path",
  "grounded_answers",
  "automation_collision",
  "access_surface",
  "writeback_control",
] as const;

export type SignalKey = (typeof signalKeys)[number];
export type SignalStrength = "strong" | "mixed" | "weak";
export type WorkKind = "service" | "customer" | "revenue";
export type PermissionEstate = "unknown" | "focused" | "sprawling";

export type BusinessSignal = {
  key: SignalKey;
  title: string;
  score: number;
  strength: SignalStrength;
  evidence: Evidence[];
  findingIds?: string[];
  gapIds?: string[];
  meaning: string;
  consumption: string;
  risk: string;
  recommendation: string;
};

export type SignalContext = {
  workKinds: WorkKind[];
  work: {
    kind: WorkKind;
    apiName: string;
    label: string;
    role?: "primary" | "secondary" | "context";
    fieldCount: number;
    requiredCount: number;
  }[];
  customObjectNames: string[];
  groundingLabels: string[];
  activeAutomationCount: number;
  writeRuleCount: number;
  permissionEstate: PermissionEstate;
  findings?: { id: string; title: string; relatedSignals: SignalKey[] }[];
  gaps?: { id: string; title: string; description: string }[];
  signals: BusinessSignal[];
};

export const readinessDimensions = signalKeys;
export type ReadinessDimension = SignalKey;

export type Evidence = {
  tool: McpToolName;
  citation: string;
  id?: string;
};

export type ToolObservation = {
  automations?: boolean;
  validationRules?: boolean;
  process?: boolean;
  security?: boolean;
  knowledge?: boolean;
  limits?: boolean;
  integrations?: boolean;
  agentforce?: boolean;
};

export type Judgment = {
  kind: "dimension" | "opportunity";
  key: string;
  title: string;
  score: number;
  evidence: Evidence[];
  reason: string;
  risk: string;
  recommendation: string;
};

export type ToolCall = {
  tool: McpToolName;
  apiName?: string;
};

export type AssessmentFacts = {
  projectType: string;
  objective: string;
  outcomes: string[];
  connection: ConnectionIdentity | null;
  objects: EnterpriseObject[];
  describes: Record<string, ObjectDescribe>;
  automations: AutomationSummary[];
  validationRules: ValidationRuleSummary[];
  process: ProcessControls | null;
  security: SecuritySummary | null;
  knowledge: KnowledgePosture | null;
  limits: OrgLimits | null;
  integrations?: IntegrationMap | null;
  agentforce?: AgentforceConfiguration | null;
  observed?: ToolObservation;
};

export type AssessmentRunResult = {
  facts: AssessmentFacts;
  traces: {
    tool: McpToolName;
    apiName?: string;
    ok: boolean;
    summary: unknown;
  }[];
  judgments: Judgment[];
  overallScore: number;
  orgIntelligence?: import("@/modules/intelligence/org-model").OrgIntelligence;
};
