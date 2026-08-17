import { createId, sql } from "@/lib/db/sql";
import type { AuditLogRow } from "@/lib/db/types";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";

type AuditMetadata = {
  [key: string]: string | number | boolean | null | undefined;
};

export async function writeAuditLog(input: {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: AuditMetadata;
}) {
  const data = scopedCreate(input.tenantId, {
    userId: input.userId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });

  const [row] = await sql`
    insert into "AuditLog" (
      id, "tenantId", "userId", action, entity, "entityId", metadata, "createdAt"
    )
    values (
      ${createId()},
      ${data.tenantId},
      ${data.userId},
      ${data.action},
      ${data.entity},
      ${data.entityId},
      ${data.metadata ? sql.json(data.metadata) : null},
      now()
    )
    returning id
  `;

  return row;
}

export async function listProjectActivity(
  tenantId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  return sql<AuditLogRow[]>`
    select *
    from "AuditLog"
    where "tenantId" = ${scoped}
      and (
        (entity = 'Project' and "entityId" = ${projectId})
        or metadata ->> 'projectId' = ${projectId}
      )
    order by "createdAt" desc
    limit 12
  `;
}

export async function listOrganizationActivity(
  tenantId: string,
  organizationId: string,
) {
  const scoped = requireTenantId(tenantId);
  return sql<AuditLogRow[]>`
    select *
    from "AuditLog"
    where "tenantId" = ${scoped}
      and (
        (entity = 'Organization' and "entityId" = ${organizationId})
        or (
          entity = 'Project'
          and metadata ->> 'organizationId' = ${organizationId}
        )
      )
    order by "createdAt" desc
    limit 20
  `;
}
