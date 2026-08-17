import { createId, sql } from "@/lib/db/sql";
import type { AssessmentRow } from "@/lib/db/types";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { getProject } from "@/server/services/projects";

export async function listTenantAssessments(
  tenantId: string,
  organizationId?: string,
) {
  const scoped = requireTenantId(tenantId);
  return sql<
    (AssessmentRow & {
      organizationName: string;
      projectName: string | null;
    })[]
  >`
    select
      a.*,
      o.name as "organizationName",
      p.name as "projectName"
    from "Assessment" a
    join "Organization" o
      on o.id = a."organizationId" and o."tenantId" = a."tenantId"
    left join "Project" p
      on p.id = a."projectId" and p."tenantId" = a."tenantId"
    where a."tenantId" = ${scoped}
      ${organizationId ? sql`and a."organizationId" = ${organizationId}` : sql``}
    order by a."updatedAt" desc
  `;
}

export async function listProjectAssessments(
  tenantId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  return sql<AssessmentRow[]>`
    select *
    from "Assessment"
    where "tenantId" = ${scoped} and "projectId" = ${projectId}
    order by "updatedAt" desc
  `;
}

export async function getLatestProjectAssessment(
  tenantId: string,
  projectId: string,
) {
  const [assessment] = await listProjectAssessments(tenantId, projectId);
  return assessment ?? null;
}

export async function startProjectDiscovery(input: {
  tenantId: string;
  userId: string;
  projectId: string;
}) {
  const project = await getProject(input.tenantId, input.projectId);

  if (!project) {
    return null;
  }

  const existing = await getLatestProjectAssessment(
    input.tenantId,
    project.id,
  );

  if (existing) {
    return existing;
  }

  const data = scopedCreate(input.tenantId, {
    organizationId: project.organizationId,
    projectId: project.id,
    status: "DRAFT" as const,
  });
  const id = createId();

  const [assessment] = await sql<AssessmentRow[]>`
    insert into "Assessment" (
      id, "tenantId", "organizationId", "projectId", status, "createdAt", "updatedAt"
    )
    values (
      ${id},
      ${data.tenantId},
      ${data.organizationId},
      ${data.projectId},
      ${data.status},
      now(),
      now()
    )
    returning *
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "assessment.start",
    entity: "Assessment",
    entityId: assessment.id,
    metadata: {
      projectId: project.id,
      organizationId: project.organizationId,
      projectType: project.projectType,
    },
  });

  return assessment;
}
