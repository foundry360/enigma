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

const projectUpdateLabels: Record<string, string> = {
  "project.create": "Project created",
  "project.update": "Project updated",
  "project.delete": "Project deleted",
  "project.connection.attach": "Environment attached",
  "project.connection.detach": "Environment removed",
  "assessment.start": "Intelligence started",
  "assessment.complete": "Intelligence completed",
  "businessCase.update": "Business case updated",
  "businessCase.approve": "Business case approved",
  "opportunity.create": "Opportunity added",
  "opportunity.delete": "Opportunity removed",
};

export type ProjectUpdateItem = {
  id: string;
  projectId: string | null;
  projectName: string;
  label: string;
  at: Date;
};

export async function listRecentProjectUpdates(
  tenantId: string,
  organizationId: string,
) {
  const scoped = requireTenantId(tenantId);
  const rows = await sql<
    {
      id: string;
      action: string;
      entity: string;
      createdAt: Date;
      projectId: string | null;
      projectName: string | null;
    }[]
  >`
    select
      a.id,
      a.action,
      a.entity,
      a."createdAt",
      coalesce(
        p.id,
        case when a.entity = 'Project' then a."entityId" end,
        a.metadata ->> 'projectId'
      ) as "projectId",
      coalesce(p.name, a.metadata ->> 'name') as "projectName"
    from "AuditLog" a
    left join "Project" p
      on p."tenantId" = a."tenantId"
      and (
        (a.entity = 'Project' and p.id = a."entityId")
        or p.id = a.metadata ->> 'projectId'
      )
    where a."tenantId" = ${scoped}
      and (
        p."organizationId" = ${organizationId}
        or a.metadata ->> 'organizationId' = ${organizationId}
      )
      and (
        p.id is not null
        or a.entity = 'Project'
      )
      and a."createdAt" >= now() - interval '30 days'
    order by a."createdAt" desc
    limit 20
  `;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectName: row.projectName?.trim() || "Project",
    label:
      projectUpdateLabels[row.action] ??
      `${row.entity} ${row.action.split(".").at(-1) ?? row.action}`,
    at: row.createdAt,
  })) satisfies ProjectUpdateItem[];
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
