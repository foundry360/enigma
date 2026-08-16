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

export const projectPlatforms = ["SALESFORCE", "PEGA", "SERVICENOW"] as const;

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
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectRow = {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  platformType: ProjectPlatform;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformConnectionRow = {
  id: string;
  tenantId: string;
  organizationId: string;
  platformType: "SALESFORCE";
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  externalOrgId: string | null;
  externalOrgName: string | null;
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
  status: "DRAFT" | "DISCOVERING" | "ANALYZING" | "COMPLETE" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
};
