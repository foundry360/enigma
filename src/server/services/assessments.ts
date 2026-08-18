import { createId, sql } from "@/lib/db/sql";
import type {
  AssessmentJudgmentRow,
  AssessmentRow,
  AssessmentTraceRow,
} from "@/lib/db/types";
import { runAssessmentPass } from "@/modules/intelligence";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { probeSalesforceConnection } from "@/server/services/connections";
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

export async function getAssessmentDetail(
  tenantId: string,
  assessmentId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [assessment] = await sql<AssessmentRow[]>`
    select *
    from "Assessment"
    where "tenantId" = ${scoped} and id = ${assessmentId}
    limit 1
  `;

  if (!assessment) {
    return null;
  }

  const [traces, judgments] = await Promise.all([
    sql<AssessmentTraceRow[]>`
      select *
      from "AssessmentTrace"
      where "tenantId" = ${scoped} and "assessmentId" = ${assessment.id}
      order by "createdAt"
    `,
    sql<AssessmentJudgmentRow[]>`
      select *
      from "AssessmentJudgment"
      where "tenantId" = ${scoped} and "assessmentId" = ${assessment.id}
      order by "sortOrder", "createdAt"
    `,
  ]);

  return { assessment, traces, judgments };
}

export async function getLatestAssessmentDetail(
  tenantId: string,
  projectId: string,
) {
  const latest = await getLatestProjectAssessment(tenantId, projectId);
  if (!latest) {
    return null;
  }

  return getAssessmentDetail(tenantId, latest.id);
}

async function resolveAssessmentConnection(
  tenantId: string,
  organizationId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [attached] = await sql<
    { id: string; organizationId: string }[]
  >`
    select c.id, c."organizationId"
    from "ProjectEnvironmentScope" e
    join "PlatformConnection" c
      on c.id = e."connectionId" and c."tenantId" = e."tenantId"
    where
      e."tenantId" = ${scoped}
      and e."projectId" = ${projectId}
      and c.status = 'CONNECTED'
      and c."instanceUrl" is not null
    order by e."createdAt" desc
    limit 1
  `;

  if (attached) {
    return attached;
  }

  const [fallback] = await sql<{ id: string; organizationId: string }[]>`
    select id, "organizationId"
    from "PlatformConnection"
    where
      "tenantId" = ${scoped}
      and "organizationId" = ${organizationId}
      and status = 'CONNECTED'
      and "instanceUrl" is not null
    order by "updatedAt" desc
    limit 1
  `;

  return fallback ?? null;
}

export async function startProjectDiscovery(input: {
  tenantId: string;
  userId: string;
  projectId: string;
}) {
  const project = await getProject(input.tenantId, input.projectId);

  if (!project) {
    return { error: "not-found" as const };
  }

  const connection = await resolveAssessmentConnection(
    input.tenantId,
    project.organizationId,
    project.id,
  );

  if (!connection) {
    return { error: "needs-connection" as const };
  }

  const session = await probeSalesforceConnection(input.tenantId, connection.id);
  if (!session.ok) {
    return {
      error: session.expired ? ("expired" as const) : ("failed" as const),
      message: session.message,
    };
  }

  const latest = await getLatestProjectAssessment(input.tenantId, project.id);
  if (
    latest &&
    (latest.status === "DISCOVERING" || latest.status === "ANALYZING")
  ) {
    return { assessment: latest };
  }

  const data = scopedCreate(input.tenantId, {
    organizationId: project.organizationId,
    projectId: project.id,
    connectionId: connection.id,
    status: "DISCOVERING" as const,
  });
  const id = createId();

  const [assessment] = await sql<AssessmentRow[]>`
    insert into "Assessment" (
      id, "tenantId", "organizationId", "projectId", "connectionId",
      status, "createdAt", "updatedAt"
    )
    values (
      ${id},
      ${data.tenantId},
      ${data.organizationId},
      ${data.projectId},
      ${data.connectionId},
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
      connectionId: connection.id,
    },
  });

  try {
    await sql`
      update "Assessment"
      set status = 'ANALYZING', "updatedAt" = now()
      where "tenantId" = ${input.tenantId} and id = ${assessment.id}
    `;

    const result = await runAssessmentPass({
      tenantId: input.tenantId,
      organizationId: project.organizationId,
      connectionId: connection.id,
      userId: input.userId,
      projectType: project.projectType,
      objective: project.objective,
      outcomes: project.outcomes,
    });

    for (const trace of result.traces) {
      await sql`
        insert into "AssessmentTrace" (
          id, "tenantId", "assessmentId", tool, "apiName", ok, summary, "createdAt"
        )
        values (
          ${createId()},
          ${input.tenantId},
          ${assessment.id},
          ${trace.tool},
          ${trace.apiName ?? null},
          ${trace.ok},
          ${sql.json(trace.summary as object)},
          now()
        )
      `;
    }

    for (const [index, judgment] of result.judgments.entries()) {
      await sql`
        insert into "AssessmentJudgment" (
          id, "tenantId", "assessmentId", kind, key, title, score,
          evidence, reason, risk, recommendation, "sortOrder", "createdAt"
        )
        values (
          ${createId()},
          ${input.tenantId},
          ${assessment.id},
          ${judgment.kind},
          ${judgment.key},
          ${judgment.title},
          ${judgment.score},
          ${sql.json(judgment.evidence)},
          ${judgment.reason},
          ${judgment.risk},
          ${judgment.recommendation},
          ${index},
          now()
        )
      `;
    }

    const failedTools = result.traces.filter((trace) => !trace.ok).length;

    await sql`
      update "Assessment"
      set
        status = 'COMPLETE',
        summary = ${sql.json({
          overallScore: result.overallScore,
          toolCalls: result.traces.length,
          failedTools,
        })},
        "updatedAt" = now()
      where "tenantId" = ${input.tenantId} and id = ${assessment.id}
    `;

    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "assessment.complete",
      entity: "Assessment",
      entityId: assessment.id,
      metadata: {
        projectId: project.id,
        overallScore: result.overallScore,
        toolCalls: result.traces.length,
        failedTools,
      },
    });

    const completed = await getLatestProjectAssessment(
      input.tenantId,
      project.id,
    );
    return { assessment: completed ?? assessment };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assessment failed.";

    await sql`
      update "Assessment"
      set
        status = 'FAILED',
        summary = ${sql.json({
          overallScore: 0,
          toolCalls: 0,
          failedTools: 0,
          error: message,
        })},
        "updatedAt" = now()
      where "tenantId" = ${input.tenantId} and id = ${assessment.id}
    `;

    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "assessment.fail",
      entity: "Assessment",
      entityId: assessment.id,
      metadata: { projectId: project.id, error: message },
    });

    return {
      error: /expired|invalid_grant/i.test(message)
        ? ("expired" as const)
        : ("failed" as const),
      assessment,
      message,
    };
  }
}
