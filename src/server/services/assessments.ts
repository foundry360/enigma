import { createId, sql } from "@/lib/db/sql";
import type {
  AssessmentJudgmentRow,
  AssessmentRow,
  AssessmentTraceRow,
} from "@/lib/db/types";
import { toUtcDate } from "@/lib/format";
import { runAssessmentPass } from "@/modules/intelligence";
import { isRevokedSalesforceGrant } from "@/modules/connectors/salesforce/session";
import {
  stampOrgIntelligenceRun,
} from "@/modules/intelligence/org-intelligence";
import {
  parseRunProgress,
  progressForStage,
  type IntelligenceRunProgress,
  type IntelligenceRunStageId,
} from "@/modules/intelligence/run-progress";
import { requireTenantId, scopedCreate } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { adoptLatestPromotedOpportunities, persistOpportunityCandidates } from "@/server/services/opportunities";
import { probeSalesforceConnection } from "@/server/services/connections";
import { getProject } from "@/server/services/projects";

function withUtcTimestamps<T extends { createdAt: Date; updatedAt?: Date }>(
  row: T,
): T {
  return {
    ...row,
    createdAt: toUtcDate(row.createdAt),
    ...(row.updatedAt ? { updatedAt: toUtcDate(row.updatedAt) } : {}),
  };
}

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
  `.then((rows) => rows.map(withUtcTimestamps));
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
  `.then((rows) => rows.map(withUtcTimestamps));
}

export async function getLatestProjectAssessment(
  tenantId: string,
  projectId: string,
) {
  const [assessment] = await listProjectAssessments(tenantId, projectId);
  return assessment ?? null;
}

export async function getLatestCompleteProjectAssessment(
  tenantId: string,
  projectId: string,
) {
  const assessments = await listProjectAssessments(tenantId, projectId);
  return (
    assessments.find((assessment) => assessment.status === "COMPLETE") ?? null
  );
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

  return {
    assessment: withUtcTimestamps(assessment),
    traces,
    judgments,
  };
}

export async function getLatestAssessmentDetail(
  tenantId: string,
  projectId: string,
) {
  const latest =
    (await getLatestCompleteProjectAssessment(tenantId, projectId)) ??
    (await getLatestProjectAssessment(tenantId, projectId));
  if (!latest) {
    return null;
  }

  return getAssessmentDetail(tenantId, latest.id);
}

export async function getProjectAssessmentDetail(
  tenantId: string,
  projectId: string,
  assessmentId: string,
) {
  const detail = await getAssessmentDetail(tenantId, assessmentId);
  if (!detail || detail.assessment.projectId !== projectId) {
    return null;
  }

  return detail;
}

export async function getProjectConsumptionSnapshots(
  tenantId: string,
  projectId: string,
) {
  const assessments = await listProjectAssessments(tenantId, projectId);
  const complete = assessments.filter(
    (assessment) => assessment.status === "COMPLETE",
  );
  const latest = complete[0] ?? null;
  const previous = complete[1] ?? null;
  const running = assessments.find(
    (assessment) =>
      assessment.status === "DISCOVERING" || assessment.status === "ANALYZING",
  );

  const [latestDetail, previousDetail] = await Promise.all([
    latest ? getAssessmentDetail(tenantId, latest.id) : null,
    previous ? getAssessmentDetail(tenantId, previous.id) : null,
  ]);

  return {
    assessments,
    complete,
    running: running ?? null,
    latest: latestDetail,
    previous: previousDetail,
  };
}

async function resolveAssessmentConnection(
  tenantId: string,
  organizationId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  const attached = await sql<
    { id: string; organizationId: string }[]
  >`
    select c.id, c."organizationId"
    from "ProjectEnvironmentScope" e
    join "PlatformConnection" c
      on c.id = e."connectionId" and c."tenantId" = e."tenantId"
    left join "ConnectionSecret" s
      on s."connectionId" = c.id and s."tenantId" = c."tenantId"
    where
      e."tenantId" = ${scoped}
      and e."projectId" = ${projectId}
      and c."platformType" = 'SALESFORCE'
      and c.status = 'CONNECTED'
      and nullif(c."instanceUrl", '') is not null
    order by (s."connectionId" is not null) desc, c."updatedAt" desc
  `;

  if (attached.length > 0) {
    return attached;
  }

  return sql<{ id: string; organizationId: string }[]>`
    select c.id, c."organizationId"
    from "PlatformConnection" c
    left join "ConnectionSecret" s
      on s."connectionId" = c.id and s."tenantId" = c."tenantId"
    where
      c."tenantId" = ${scoped}
      and c."organizationId" = ${organizationId}
      and c."platformType" = 'SALESFORCE'
      and c.status = 'CONNECTED'
      and nullif(c."instanceUrl", '') is not null
    order by (s."connectionId" is not null) desc, c."updatedAt" desc
  `;
}

async function resolveLiveAssessmentConnection(
  tenantId: string,
  organizationId: string,
  projectId: string,
) {
  const candidates = await resolveAssessmentConnection(
    tenantId,
    organizationId,
    projectId,
  );

  if (candidates.length === 0) {
    return { error: "needs-connection" as const };
  }

  let expiredMessage: string | null = null;

  for (const candidate of candidates) {
    const session = await probeSalesforceConnection(tenantId, candidate.id);
    if (session.ok) {
      return { connection: candidate };
    }
    if (session.expired) {
      expiredMessage = session.message;
      continue;
    }
  }

  return {
    error: (expiredMessage ? "expired" : "failed") as "expired" | "failed",
    message:
      expiredMessage ?? "Salesforce could not be reached for this project.",
  };
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

  const live = await resolveLiveAssessmentConnection(
    input.tenantId,
    project.organizationId,
    project.id,
  );

  if ("error" in live) {
    return live;
  }

  const connection = live.connection;

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

  await writeRunProgress(input.tenantId, assessment.id, "connect");

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
      onStage: (stage) =>
        writeRunProgress(input.tenantId, assessment.id, stage),
    });

    await writeRunProgress(input.tenantId, assessment.id, "save");

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
          ${sql.json(asSqlJson(trace.summary))},
          now()
        )
      `;
    }

    const storedJudgments: AssessmentJudgmentRow[] = [];
    for (const [index, judgment] of result.judgments.entries()) {
      const judgmentId = createId();
      await sql`
        insert into "AssessmentJudgment" (
          id, "tenantId", "assessmentId", kind, key, title, score,
          evidence, reason, risk, recommendation, "sortOrder", "createdAt"
        )
        values (
          ${judgmentId},
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
      storedJudgments.push({
        id: judgmentId,
        tenantId: input.tenantId,
        assessmentId: assessment.id,
        kind: judgment.kind,
        key: judgment.key,
        title: judgment.title,
        score: judgment.score,
        evidence: judgment.evidence,
        reason: judgment.reason,
        risk: judgment.risk,
        recommendation: judgment.recommendation,
        sortOrder: index,
        createdAt: new Date(),
      });
    }

    if (project.id) {
      await persistOpportunityCandidates({
        tenantId: input.tenantId,
        projectId: project.id,
        assessmentId: assessment.id,
        judgments: storedJudgments,
      });
      try {
        await adoptLatestPromotedOpportunities({
          tenantId: input.tenantId,
          projectId: project.id,
          assessmentId: assessment.id,
        });
      } catch {
        const { invalidateBusinessCaseStories } = await import(
          "@/server/services/business-case"
        );
        await invalidateBusinessCaseStories(input.tenantId, project.id);
      }
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
        "orgIntelligence" = ${
          result.orgIntelligence
            ? sql.json(
                asSqlJson(
                  stampOrgIntelligenceRun(result.orgIntelligence, assessment.id),
                ),
              )
            : sql`null`
        },
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
      error: isRevokedSalesforceGrant(message)
        ? ("expired" as const)
        : ("failed" as const),
      assessment,
      message,
    };
  }
}

async function writeRunProgress(
  tenantId: string,
  assessmentId: string,
  stage: IntelligenceRunStageId,
  done = false,
) {
  const scoped = requireTenantId(tenantId);
  const progress = progressForStage(stage, done);
  await sql`
    update "Assessment"
    set
      summary = ${sql.json({
        overallScore: 0,
        toolCalls: 0,
        failedTools: 0,
        progress: {
          id: stage,
          stage: progress.stage,
          index: progress.index,
          total: progress.total,
          done: progress.done,
        },
      })},
      "updatedAt" = now()
    where "tenantId" = ${scoped}
      and id = ${assessmentId}
      and status in ('DISCOVERING', 'ANALYZING')
  `;
}

export async function getDiscoveryProgress(
  tenantId: string,
  projectId: string,
): Promise<IntelligenceRunProgress> {
  const assessments = await listProjectAssessments(tenantId, projectId);
  const running = assessments.find(
    (assessment) =>
      assessment.status === "DISCOVERING" || assessment.status === "ANALYZING",
  );

  if (!running) {
    return progressForStage("connect");
  }

  return parseRunProgress(running.summary?.progress) ?? progressForStage("connect");
}

export async function setOpportunityCandidateStatus(input: {
  tenantId: string;
  assessmentId: string;
  key: string;
  status: "candidate" | "promoted" | "rejected";
}) {
  const detail = await getAssessmentDetail(input.tenantId, input.assessmentId);
  if (!detail || detail.assessment.status !== "COMPLETE") {
    return { error: "not-found" as const };
  }

  const summary = {
    overallScore: 0,
    toolCalls: 0,
    failedTools: 0,
    ...detail.assessment.summary,
    candidates: {
      ...(detail.assessment.summary?.candidates ?? {}),
      [input.key]: input.status,
    },
  };

  await sql`
    update "Assessment"
    set
      summary = ${sql.json(summary)},
      "updatedAt" = now()
    where "tenantId" = ${input.tenantId} and id = ${detail.assessment.id}
  `;

  return { assessment: detail.assessment };
}

function asSqlJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}
