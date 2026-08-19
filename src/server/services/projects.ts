import { createId, sql } from "@/lib/db/sql";
import type {
  AssessmentRow,
  PlatformConnectionRow,
  ProjectEnvironmentScopeRow,
  ProjectPlatformScopeRow,
  ProjectRow,
} from "@/lib/db/types";
import type { ProjectPlatform } from "@/lib/platforms";
import { DEFAULT_PROJECT_STATUS } from "@/lib/projects";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";
import { getAccount } from "@/server/services/accounts";
import { listProjectActivity, writeAuditLog } from "@/server/services/audit";

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

export async function getProjectForEdit(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const project = await getProject(tenantId, projectId);

  if (!project) {
    return null;
  }

  const platforms = await sql<Pick<ProjectPlatformScopeRow, "platformType">[]>`
    select "platformType"
    from "ProjectPlatformScope"
    where "tenantId" = ${scoped} and "projectId" = ${project.id}
    order by "platformType"
  `;

  return {
    project,
    platforms: platforms.map((row) => row.platformType),
  };
}

export async function getProjectOverview(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const project = await getProject(tenantId, projectId);

  if (!project) {
    return null;
  }

  const [
    organization,
    owner,
    platforms,
    environments,
    connections,
    assessments,
    activity,
    businessCases,
  ] = await Promise.all([
      sql<{ id: string; name: string }[]>`
        select id, name
        from "Organization"
        where "tenantId" = ${scoped} and id = ${project.organizationId}
        limit 1
      `,
      project.ownerId
        ? sql<{ id: string; name: string }[]>`
            select id, name
            from "User"
            where "tenantId" = ${scoped} and id = ${project.ownerId}
            limit 1
          `
        : Promise.resolve([]),
      sql<ProjectPlatformScopeRow[]>`
        select *
        from "ProjectPlatformScope"
        where "tenantId" = ${scoped} and "projectId" = ${project.id}
        order by "platformType"
      `,
      sql<
        (ProjectEnvironmentScopeRow &
          Pick<
            PlatformConnectionRow,
            "platformType" | "status" | "externalOrgName"
          >)[]
      >`
        select
          e.*,
          c."platformType",
          c.status,
          c."externalOrgName"
        from "ProjectEnvironmentScope" e
        join "PlatformConnection" c
          on c.id = e."connectionId" and c."tenantId" = e."tenantId"
        where e."tenantId" = ${scoped} and e."projectId" = ${project.id}
        order by c."platformType"
      `,
      sql<PlatformConnectionRow[]>`
        select
          id, "tenantId", "organizationId", "platformType", status,
          "externalOrgId", "externalOrgName", "instanceUrl",
          "connectedAt", "createdAt", "updatedAt"
        from "PlatformConnection"
        where "tenantId" = ${scoped} and "organizationId" = ${project.organizationId}
        order by "updatedAt" desc
      `,
      sql<AssessmentRow[]>`
        select *
        from "Assessment"
        where "tenantId" = ${scoped} and "projectId" = ${project.id}
        order by "updatedAt" desc
      `,
      listProjectActivity(tenantId, project.id),
      sql<{ status: string }[]>`
        select status
        from "BusinessCase"
        where "tenantId" = ${scoped} and "projectId" = ${project.id}
        limit 1
      `,
    ]);

  const scopedTypes = platforms.map((platform) => platform.platformType);
  const connected = connections.some(
    (connection) =>
      connection.status === "CONNECTED" &&
      (scopedTypes.length === 0 ||
        scopedTypes.includes(connection.platformType)),
  );
  const assessment = assessments[0] ?? null;
  const businessCase = businessCases[0] ?? null;
  const nextAction: "connect" | "discover" | "continue" | "prioritize" =
    !connected
      ? "connect"
      : !assessment ||
          assessment.status === "DRAFT" ||
          assessment.status === "FAILED"
        ? "discover"
        : assessment.status === "COMPLETE"
          ? "prioritize"
          : "continue";

  return {
    project,
    organization: organization[0] ?? null,
    owner: owner[0] ?? null,
    platforms,
    environments,
    connections,
    assessment,
    assessments,
    activity,
    nextAction,
    hasBusinessCase: Boolean(businessCase),
    businessCaseStatus: businessCase?.status ?? null,
  };
}

export async function createProject(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  name: string;
  projectType: string;
  objective: string;
  outcomes: string[];
  outcomeOther?: string;
  ownerId: string;
  status?: string;
  platforms?: string[];
  environmentIds?: string[];
  description?: string;
  businessUnit?: string;
  department?: string;
  executiveSponsor?: string;
  customerLead?: string;
  targetDate?: string;
  priority?: string;
  successMetrics?: string;
  notes?: string;
  implementationCost?: number;
  discoveryCost?: number;
  knowledgeCost?: number;
  changeManagementCost?: number;
  servicesCost?: number;
  otherCost?: number;
  annualVolume?: number;
  unitPrice?: number;
  hoursSavedPerUnit?: number;
  hourlyCost?: number;
  conservativeAdoption?: number;
  expectedAdoption?: number;
  aggressiveAdoption?: number;
  baselineDays?: number;
  enigmaDays?: number;
}) {
  const organization = await getAccount(input.tenantId, input.organizationId);

  if (!organization) {
    throw new Error("Organization not found");
  }

  const platforms = [...new Set(input.platforms ?? [])] as ProjectPlatform[];
  const primaryPlatform = platforms[0] ?? null;
  const data = scopedCreate(input.tenantId, {
    organizationId: organization.id,
    name: input.name,
    projectType: input.projectType,
    objective: input.objective,
    outcomes: input.outcomes,
    outcomeOther: input.outcomeOther || null,
    ownerId: input.ownerId,
    status: input.status || DEFAULT_PROJECT_STATUS,
    description: input.description || null,
    businessUnit: input.businessUnit || null,
    department: input.department || null,
    executiveSponsor: input.executiveSponsor || null,
    customerLead: input.customerLead || null,
    targetDate: input.targetDate || null,
    priority: input.priority || null,
    successMetrics: input.successMetrics || null,
    notes: input.notes || null,
    implementationCost: input.implementationCost ?? null,
    discoveryCost: input.discoveryCost ?? null,
    knowledgeCost: input.knowledgeCost ?? null,
    changeManagementCost: input.changeManagementCost ?? null,
    servicesCost: input.servicesCost ?? null,
    otherCost: input.otherCost ?? null,
    annualVolume: input.annualVolume ?? null,
    unitPrice: input.unitPrice ?? null,
    hoursSavedPerUnit: input.hoursSavedPerUnit ?? null,
    hourlyCost: input.hourlyCost ?? null,
    conservativeAdoption: input.conservativeAdoption ?? null,
    expectedAdoption: input.expectedAdoption ?? null,
    aggressiveAdoption: input.aggressiveAdoption ?? null,
    baselineDays: input.baselineDays ?? null,
    enigmaDays: input.enigmaDays ?? null,
    connectPlatformLater: (input.environmentIds?.length ?? 0) === 0,
    platformType: primaryPlatform,
  });
  const id = createId();

  const [project] = await sql<ProjectRow[]>`
    insert into "Project" (
      id, "tenantId", "organizationId", name, "platformType", "projectType",
      objective, outcomes, "outcomeOther", "ownerId", status, description,
      "businessUnit", department, "executiveSponsor", "customerLead",
      "targetDate", priority, "successMetrics", notes, "implementationCost",
      "discoveryCost", "knowledgeCost", "changeManagementCost", "servicesCost",
      "otherCost", "annualVolume", "unitPrice", "hoursSavedPerUnit", "hourlyCost",
      "conservativeAdoption", "expectedAdoption", "aggressiveAdoption",
      "baselineDays", "enigmaDays", "connectPlatformLater", "createdAt",
      "updatedAt"
    )
    values (
      ${id},
      ${data.tenantId},
      ${data.organizationId},
      ${data.name},
      ${data.platformType},
      ${data.projectType},
      ${data.objective},
      ${sql.json(data.outcomes)},
      ${data.outcomeOther},
      ${data.ownerId},
      ${data.status},
      ${data.description},
      ${data.businessUnit},
      ${data.department},
      ${data.executiveSponsor},
      ${data.customerLead},
      ${data.targetDate},
      ${data.priority},
      ${data.successMetrics},
      ${data.notes},
      ${data.implementationCost},
      ${data.discoveryCost},
      ${data.knowledgeCost},
      ${data.changeManagementCost},
      ${data.servicesCost},
      ${data.otherCost},
      ${data.annualVolume},
      ${data.unitPrice},
      ${data.hoursSavedPerUnit},
      ${data.hourlyCost},
      ${data.conservativeAdoption},
      ${data.expectedAdoption},
      ${data.aggressiveAdoption},
      ${data.baselineDays},
      ${data.enigmaDays},
      ${data.connectPlatformLater},
      now(),
      now()
    )
    returning *
  `;

  if (platforms.length > 0) {
    for (const platformType of platforms) {
      await sql`
        insert into "ProjectPlatformScope" (
          id, "tenantId", "projectId", "platformType", "createdAt"
        )
        values (
          ${createId()},
          ${data.tenantId},
          ${project.id},
          ${platformType},
          now()
        )
      `;
    }
  }

  const environmentIds = [...new Set(input.environmentIds ?? [])];
  if (environmentIds.length > 0) {
    const connections = await sql<Pick<PlatformConnectionRow, "id">[]>`
      select id
      from "PlatformConnection"
      where "tenantId" = ${data.tenantId}
        and "organizationId" = ${organization.id}
        and id in ${sql(environmentIds)}
    `;

    for (const connection of connections) {
      await sql`
        insert into "ProjectEnvironmentScope" (
          id, "tenantId", "projectId", "connectionId", "createdAt"
        )
        values (
          ${createId()},
          ${data.tenantId},
          ${project.id},
          ${connection.id},
          now()
        )
      `;
    }
  }

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "project.create",
    entity: "Project",
    entityId: project.id,
    metadata: {
      name: project.name,
      organizationId: project.organizationId,
      projectType: project.projectType,
    },
  });

  return project;
}

export async function updateProject(input: {
  tenantId: string;
  userId: string;
  projectId: string;
  name: string;
  projectType: string;
  objective: string;
  outcomes: string[];
  outcomeOther?: string;
  ownerId: string;
  status?: string;
  platforms?: string[];
  description?: string;
  businessUnit?: string;
  department?: string;
  executiveSponsor?: string;
  customerLead?: string;
  targetDate?: string;
  priority?: string;
  successMetrics?: string;
  notes?: string;
  implementationCost?: number;
  discoveryCost?: number;
  knowledgeCost?: number;
  changeManagementCost?: number;
  servicesCost?: number;
  otherCost?: number;
  annualVolume?: number;
  unitPrice?: number;
  hoursSavedPerUnit?: number;
  hourlyCost?: number;
  conservativeAdoption?: number;
  expectedAdoption?: number;
  aggressiveAdoption?: number;
  baselineDays?: number;
  enigmaDays?: number;
}) {
  const scoped = requireTenantId(input.tenantId);
  const project = await getProject(input.tenantId, input.projectId);

  if (!project) {
    return null;
  }

  const platforms = [...new Set(input.platforms ?? [])] as ProjectPlatform[];
  const primaryPlatform = platforms[0] ?? project.platformType;

  const [updated] = await sql<ProjectRow[]>`
    update "Project"
    set
      name = ${input.name},
      "projectType" = ${input.projectType},
      objective = ${input.objective},
      outcomes = ${sql.json(input.outcomes)},
      "outcomeOther" = ${input.outcomeOther || null},
      "ownerId" = ${input.ownerId},
      status = ${input.status || project.status},
      "platformType" = ${primaryPlatform},
      description = ${input.description || null},
      "businessUnit" = ${input.businessUnit || null},
      department = ${input.department || null},
      "executiveSponsor" = ${input.executiveSponsor || null},
      "customerLead" = ${input.customerLead || null},
      "targetDate" = ${input.targetDate || null},
      priority = ${input.priority || null},
      "successMetrics" = ${input.successMetrics || null},
      notes = ${input.notes || null},
      "implementationCost" = ${input.implementationCost ?? null},
      "discoveryCost" = ${input.discoveryCost ?? null},
      "knowledgeCost" = ${input.knowledgeCost ?? null},
      "changeManagementCost" = ${input.changeManagementCost ?? null},
      "servicesCost" = ${input.servicesCost ?? null},
      "otherCost" = ${input.otherCost ?? null},
      "annualVolume" = ${input.annualVolume ?? null},
      "unitPrice" = ${input.unitPrice ?? null},
      "hoursSavedPerUnit" = ${input.hoursSavedPerUnit ?? null},
      "hourlyCost" = ${input.hourlyCost ?? null},
      "conservativeAdoption" = ${input.conservativeAdoption ?? null},
      "expectedAdoption" = ${input.expectedAdoption ?? null},
      "aggressiveAdoption" = ${input.aggressiveAdoption ?? null},
      "baselineDays" = ${input.baselineDays ?? null},
      "enigmaDays" = ${input.enigmaDays ?? null},
      "updatedAt" = now()
    where id = ${project.id} and "tenantId" = ${scoped}
    returning *
  `;

  await sql`
    delete from "ProjectPlatformScope"
    where "tenantId" = ${scoped} and "projectId" = ${project.id}
  `;

  for (const platformType of platforms) {
    await sql`
      insert into "ProjectPlatformScope" (
        id, "tenantId", "projectId", "platformType", "createdAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${project.id},
        ${platformType},
        now()
      )
    `;
  }

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "project.update",
    entity: "Project",
    entityId: project.id,
    metadata: {
      name: input.name,
      organizationId: project.organizationId,
    },
  });

  return updated ?? null;
}

export async function setProjectEnvironment(input: {
  tenantId: string;
  userId: string;
  projectId: string;
  connectionId: string;
  attached: boolean;
}) {
  const scoped = requireTenantId(input.tenantId);
  const project = await getProject(input.tenantId, input.projectId);

  if (!project) {
    return null;
  }

  const [connection] = await sql<Pick<PlatformConnectionRow, "id">[]>`
    select id
    from "PlatformConnection"
    where "tenantId" = ${scoped}
      and "organizationId" = ${project.organizationId}
      and id = ${input.connectionId}
    limit 1
  `;

  if (!connection) {
    return null;
  }

  if (input.attached) {
    await sql`
      insert into "ProjectEnvironmentScope" (
        id, "tenantId", "projectId", "connectionId", "createdAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${project.id},
        ${connection.id},
        now()
      )
      on conflict ("projectId", "connectionId") do nothing
    `;
  } else {
    await sql`
      delete from "ProjectEnvironmentScope"
      where "tenantId" = ${scoped}
        and "projectId" = ${project.id}
        and "connectionId" = ${connection.id}
    `;
  }

  const remaining = await sql<{ count: number }[]>`
    select count(*)::int as count
    from "ProjectEnvironmentScope"
    where "tenantId" = ${scoped} and "projectId" = ${project.id}
  `;

  await sql`
    update "Project"
    set
      "connectPlatformLater" = ${remaining[0]?.count === 0},
      "updatedAt" = now()
    where id = ${project.id} and "tenantId" = ${scoped}
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: input.attached ? "project.connection.attach" : "project.connection.detach",
    entity: "Project",
    entityId: project.id,
    metadata: {
      connectionId: connection.id,
      organizationId: project.organizationId,
      name: project.name,
    },
  });

  return project;
}

export async function deleteProject(input: {
  tenantId: string;
  userId: string;
  projectId: string;
}) {
  const scoped = requireTenantId(input.tenantId);
  const project = await getProject(input.tenantId, input.projectId);

  if (!project) {
    return null;
  }

  await sql`
    delete from "Assessment"
    where "tenantId" = ${scoped} and "projectId" = ${project.id}
  `;

  await sql`
    delete from "Project"
    where id = ${project.id} and "tenantId" = ${scoped}
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "project.delete",
    entity: "Project",
    entityId: project.id,
    metadata: {
      name: project.name,
      organizationId: project.organizationId,
    },
  });

  return project;
}
