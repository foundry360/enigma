import type { McpToolName } from "@/modules/mcp/catalog";
import type {
  AutomationSummary,
  ConnectionIdentity,
  EnterpriseObject,
  KnowledgePosture,
  ObjectDescribe,
  OrgLimits,
  SecuritySummary,
  ValidationRuleSummary,
} from "@/modules/enterprise/types";

export const readinessDimensions = [
  "data",
  "process",
  "knowledge",
  "automation",
  "security",
  "governance",
] as const;

export type ReadinessDimension = (typeof readinessDimensions)[number];

export type Evidence = {
  tool: McpToolName;
  citation: string;
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
  security: SecuritySummary | null;
  knowledge: KnowledgePosture | null;
  limits: OrgLimits | null;
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
};
