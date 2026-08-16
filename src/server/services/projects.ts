import { createId, sql } from "@/lib/db/sql";
import type { ProjectRow } from "@/lib/db/types";
import type { ProjectPlatform } from "@/lib/platforms";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";
import { getAccount } from "@/server/services/accounts";
import { writeAuditLog } from "@/server/services/audit";

export async function listProjects(tenantId: string, organizationId?: string) {
  const scoped = requireTenantId(tenantId);

  if (organizationId) {
    return sql<ProjectRow[]>`
      select *
      from "Project"
      where "tenantId" = ${scoped} and "organizationId" = ${organizationId}
      order by "updatedAt" desc
    `;
  }

  return sql<ProjectRow[]>`
    select *
    from "Project"
    where "tenantId" = ${scoped}
    order by "updatedAt" desc
  `;
}

export async function getProject(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const [project] = await sql<ProjectRow[]>`
    select *
    from "Project"
    where "tenantId" = ${scoped} and id = ${projectId}
    limit 1
  `;
  return project ?? null;
}

export async function createProject(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  name: string;
  platformType: ProjectPlatform;
}) {
  const organization = await getAccount(input.tenantId, input.organizationId);

  if (!organization) {
    throw new Error("Account not found");
  }

  const data = scopedCreate(input.tenantId, {
    organizationId: organization.id,
    name: input.name,
    platformType: input.platformType,
  });
  const id = createId();

  const [project] = await sql<ProjectRow[]>`
    insert into "Project" (
      id, "tenantId", "organizationId", name, "platformType", "createdAt", "updatedAt"
    )
    values (
      ${id},
      ${data.tenantId},
      ${data.organizationId},
      ${data.name},
      ${data.platformType},
      now(),
      now()
    )
    returning *
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "project.create",
    entity: "Project",
    entityId: project.id,
    metadata: {
      name: project.name,
      platformType: project.platformType,
      organizationId: project.organizationId,
    },
  });

  return project;
}
