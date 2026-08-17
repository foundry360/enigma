import { createId, sql } from "@/lib/db/sql";
import type {
  AssessmentRow,
  OrganizationRow,
  PlatformConnectionRow,
} from "@/lib/db/types";
import { scopedCreate, requireTenantId } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { getUserProfile } from "@/server/services/users";

export function resolveSelectedAccount<T extends { id: string }>(
  accounts: T[],
  selectedId: string | null | undefined,
) {
  if (!selectedId) {
    return null;
  }

  return accounts.find((account) => account.id === selectedId) ?? null;
}

export async function getAccountSelection(tenantId: string, userId: string) {
  const [accounts, profile] = await Promise.all([
    listAccountChoices(tenantId),
    getUserProfile(tenantId, userId),
  ]);
  const selected = resolveSelectedAccount(
    accounts,
    profile?.selectedOrganizationId,
  );

  return { accounts, selected };
}

export async function listAccountChoices(tenantId: string) {
  const scoped = requireTenantId(tenantId);
  return sql<Pick<OrganizationRow, "id" | "name">[]>`
    select id, name
    from "Organization"
    where "tenantId" = ${scoped}
    order by "updatedAt" desc
  `;
}

export async function getAccount(tenantId: string, organizationId: string) {
  const scoped = requireTenantId(tenantId);
  const [organization] = await sql<OrganizationRow[]>`
    select *
    from "Organization"
    where "tenantId" = ${scoped} and id = ${organizationId}
    limit 1
  `;
  return organization ?? null;
}

export async function listAccounts(tenantId: string) {
  const scoped = requireTenantId(tenantId);
  const organizations = await sql<OrganizationRow[]>`
    select *
    from "Organization"
    where "tenantId" = ${scoped}
    order by "updatedAt" desc
  `;

  if (organizations.length === 0) {
    return [];
  }

  const ids = organizations.map((organization) => organization.id);
  const [connections, assessments, projectCounts] = await Promise.all([
    sql<
      Pick<
        PlatformConnectionRow,
        "id" | "organizationId" | "platformType" | "status"
      >[]
    >`
      select id, "organizationId", "platformType", status
      from "PlatformConnection"
      where "tenantId" = ${scoped} and "organizationId" in ${sql(ids)}
    `,
    sql<
      Pick<AssessmentRow, "id" | "organizationId" | "status" | "createdAt">[]
    >`
      select distinct on ("organizationId")
        id, "organizationId", status, "createdAt"
      from "Assessment"
      where "tenantId" = ${scoped} and "organizationId" in ${sql(ids)}
      order by "organizationId", "createdAt" desc
    `,
    sql<{ organizationId: string; count: number }[]>`
      select "organizationId", count(*)::int as count
      from "Project"
      where "tenantId" = ${scoped} and "organizationId" in ${sql(ids)}
      group by "organizationId"
    `,
  ]);

  const projectsByOrg = new Map(
    projectCounts.map((row) => [row.organizationId, row.count]),
  );

  return organizations.map((organization) => ({
    ...organization,
    connections: connections.filter(
      (connection) => connection.organizationId === organization.id,
    ),
    assessments: assessments.filter(
      (assessment) => assessment.organizationId === organization.id,
    ),
    projectCount: projectsByOrg.get(organization.id) ?? 0,
  }));
}

export async function createAccount(input: {
  tenantId: string;
  userId: string;
  name: string;
  industry?: string;
  organizationType?: string;
  employeeRange?: string;
  primaryContact?: string;
  customerStatus?: string;
}) {
  const data = scopedCreate(input.tenantId, {
    name: input.name,
    industry: input.industry || null,
    organizationType: input.organizationType || null,
    employeeRange: input.employeeRange || null,
    primaryContact: input.primaryContact || null,
    customerStatus: input.customerStatus || null,
  });
  const id = createId();

  const [organization] = await sql<OrganizationRow[]>`
    insert into "Organization" (
      id, "tenantId", name, industry, "organizationType", "employeeRange",
      "primaryContact", "customerStatus", "createdAt", "updatedAt"
    )
    values (
      ${id},
      ${data.tenantId},
      ${data.name},
      ${data.industry},
      ${data.organizationType},
      ${data.employeeRange},
      ${data.primaryContact},
      ${data.customerStatus},
      now(),
      now()
    )
    returning *
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "organization.create",
    entity: "Organization",
    entityId: organization.id,
    metadata: { name: organization.name },
  });

  return organization;
}

export async function updateAccount(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  name: string;
  industry?: string;
  organizationType?: string;
  employeeRange?: string;
  primaryContact?: string;
  customerStatus?: string;
}) {
  const scoped = requireTenantId(input.tenantId);
  const [organization] = await sql<OrganizationRow[]>`
    update "Organization"
    set
      name = ${input.name},
      industry = ${input.industry || null},
      "organizationType" = ${input.organizationType || null},
      "employeeRange" = ${input.employeeRange || null},
      "primaryContact" = ${input.primaryContact || null},
      "customerStatus" = ${input.customerStatus || null},
      "updatedAt" = now()
    where id = ${input.organizationId} and "tenantId" = ${scoped}
    returning *
  `;

  if (organization) {
    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "organization.update",
      entity: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name },
    });
  }

  return organization ?? null;
}

export async function setOrganizationDisabled(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  disabled: boolean;
}) {
  const scoped = requireTenantId(input.tenantId);
  const [organization] = await sql<OrganizationRow[]>`
    update "Organization"
    set disabled = ${input.disabled}, "updatedAt" = now()
    where id = ${input.organizationId} and "tenantId" = ${scoped}
    returning *
  `;

  if (organization) {
    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.disabled
        ? "organization.disable"
        : "organization.enable",
      entity: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name },
    });
  }

  return organization ?? null;
}

export async function deleteAccount(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
}) {
  const scoped = requireTenantId(input.tenantId);
  const organization = await getAccount(input.tenantId, input.organizationId);

  if (!organization) {
    return null;
  }

  await sql`
    delete from "Organization"
    where id = ${organization.id} and "tenantId" = ${scoped}
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "organization.delete",
    entity: "Organization",
    entityId: organization.id,
    metadata: { name: organization.name },
  });

  return organization;
}

export async function listTenantConnections(tenantId: string) {
  const scoped = requireTenantId(tenantId);
  return sql<PlatformConnectionRow[]>`
    select *
    from "PlatformConnection"
    where "tenantId" = ${scoped}
    order by "updatedAt" desc
  `;
}

export async function listConnections(tenantId: string, organizationId: string) {
  const scoped = requireTenantId(tenantId);
  return sql<PlatformConnectionRow[]>`
    select *
    from "PlatformConnection"
    where "tenantId" = ${scoped} and "organizationId" = ${organizationId}
    order by "updatedAt" desc
  `;
}

export async function listAssessments(tenantId: string, organizationId: string) {
  const scoped = requireTenantId(tenantId);
  return sql<AssessmentRow[]>`
    select *
    from "Assessment"
    where "tenantId" = ${scoped} and "organizationId" = ${organizationId}
    order by "updatedAt" desc
  `;
}

export async function getWorkspaceSummary(tenantId: string) {
  const scoped = requireTenantId(tenantId);
  const [accounts, assessments, connections] = await Promise.all([
    sql<{ count: number }[]>`
      select count(*)::int as count
      from "Organization"
      where "tenantId" = ${scoped}
    `,
    sql<{ count: number }[]>`
      select count(*)::int as count
      from "Assessment"
      where "tenantId" = ${scoped}
    `,
    sql<{ count: number }[]>`
      select count(*)::int as count
      from "PlatformConnection"
      where "tenantId" = ${scoped}
    `,
  ]);

  return {
    accountCount: accounts[0]?.count ?? 0,
    assessmentCount: assessments[0]?.count ?? 0,
    connectionCount: connections[0]?.count ?? 0,
  };
}
