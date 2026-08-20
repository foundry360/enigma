import type { OrgProfile } from "@/modules/enterprise/types";

export const userRoles = ["ADMIN", "AE", "RVP", "PARTNER", "CUSTOMER"] as const;

export type UserRole = (typeof userRoles)[number];

export type UserRow = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  avatarPath: string | null;
  selectedOrganizationId: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export const projectPlatforms = [
  "SALESFORCE",
  "PEGA",
  "SERVICENOW",
  "MICROSOFT",
  "OTHER",
] as const;

export type ProjectPlatform = (typeof projectPlatforms)[number];

export type OrganizationRow = {
  id: string;
  tenantId: string;
  name: string;
  industry: string | null;
  organizationType: string | null;
  employeeRange: string | null;
  primaryContact: string | null;
  customerStatus: string | null;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectRow = {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  platformType: ProjectPlatform | null;
  projectType: string;
  objective: string;
  outcomes: string[];
  outcomeOther: string | null;
  ownerId: string | null;
  status: string;
  description: string | null;
  businessUnit: string | null;
  department: string | null;
  executiveSponsor: string | null;
  customerLead: string | null;
  targetDate: Date | string | null;
  priority: string | null;
  successMetrics: string | null;
  notes: string | null;
  implementationCost: number | null;
  discoveryCost: number | null;
  knowledgeCost: number | null;
  changeManagementCost: number | null;
  servicesCost: number | null;
  otherCost: number | null;
  annualVolume: number | null;
  unitPrice: number | null;
  hoursSavedPerUnit: number | null;
  hourlyCost: number | null;
  conservativeAdoption: number | null;
  expectedAdoption: number | null;
  aggressiveAdoption: number | null;
  baselineDays: number | null;
  enigmaDays: number | null;
  connectPlatformLater: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectPlatformScopeRow = {
  id: string;
  tenantId: string;
  projectId: string;
  platformType: ProjectPlatform;
  createdAt: Date;
};

export type ProjectEnvironmentScopeRow = {
  id: string;
  tenantId: string;
  projectId: string;
  connectionId: string;
  createdAt: Date;
};

export type PlatformConnectionRow = {
  id: string;
  tenantId: string;
  organizationId: string;
  platformType: "SALESFORCE";
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  externalOrgId: string | null;
  externalOrgName: string | null;
  instanceUrl: string | null;
  orgProfile: OrgProfile | null;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLogRow = {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type AssessmentRow = {
  id: string;
  tenantId: string;
  organizationId: string;
  projectId: string | null;
  connectionId: string | null;
  status: "DRAFT" | "DISCOVERING" | "ANALYZING" | "COMPLETE" | "FAILED";
  orgIntelligence?: import("@/modules/intelligence/org-model").OrgIntelligence | null;
  summary: {
    overallScore: number;
    toolCalls: number;
    failedTools: number;
    error?: string;
    candidates?: Record<
      string,
      "candidate" | "validated" | "rejected" | "promoted"
    >;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AssessmentTraceRow = {
  id: string;
  tenantId: string;
  assessmentId: string;
  tool: string;
  apiName: string | null;
  ok: boolean;
  summary: unknown;
  createdAt: Date;
};

export type AssessmentJudgmentRow = {
  id: string;
  tenantId: string;
  assessmentId: string;
  kind: "dimension" | "opportunity";
  key: string;
  title: string;
  score: number;
  evidence: { tool: string; citation: string; expansion?: string }[];
  reason: string;
  risk: string;
  recommendation: string;
  sortOrder: number;
  createdAt: Date;
};

export type CandidateStatus =
  | "candidate"
  | "validated"
  | "rejected"
  | "promoted";

export type CandidateConfidence = "high" | "medium" | "low";

export type CandidateSignalRef = {
  key: string;
  title: string;
  strength: "strong" | "mixed" | "weak";
  score: number;
};

export type OpportunityCandidateRow = {
  id: string;
  tenantId: string;
  projectId: string;
  assessmentId: string;
  judgmentId: string | null;
  key: string;
  name: string;
  description: string;
  candidateType: string;
  businessArea: string;
  businessProcess: string;
  recommendedCapability: string;
  supportingSignals: CandidateSignalRef[];
  evidence: { tool: string; citation: string; expansion?: string }[];
  finding: string;
  confidence: CandidateConfidence;
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies: string[];
  status: CandidateStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  promotedAt: Date | null;
  promotedBy: string | null;
};

export type ProjectOpportunityRow = {
  id: string;
  tenantId: string;
  projectId: string;
  candidateId: string;
  assessmentId: string;
  name: string;
  description: string;
  businessArea: string;
  businessProcess: string;
  recommendedCapability: string;
  confidence: CandidateConfidence;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessCaseScenario =
  | "conservative"
  | "expected"
  | "aggressive";

export type BusinessCaseStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected";

export type BusinessCaseRow = {
  id: string;
  tenantId: string;
  projectId: string;
  scenario: BusinessCaseScenario;
  monthsAccelerated: number | null;
  status: BusinessCaseStatus;
  conservativeAdoption: number;
  expectedAdoption: number;
  aggressiveAdoption: number;
  baselineDays: number | null;
  enigmaDays: number | null;
  predictedSnapshot: Record<string, unknown> | null;
  recommendationState: string | null;
  recommendationNarrative: string | null;
  justificationNarrative: string | null;
  intelligenceNarrative: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessCaseLineRow = {
  id: string;
  tenantId: string;
  businessCaseId: string;
  opportunityId: string;
  annualVolume: number | null;
  unitPrice: number | null;
  hoursSavedPerUnit: number | null;
  hourlyCost: number | null;
  implementationCost: number | null;
  createdAt: Date;
  updatedAt: Date;
};
