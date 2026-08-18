import { createId, sql } from "@/lib/db/sql";
import type {
  AssessmentJudgmentRow,
  CandidateStatus,
  OpportunityCandidateRow,
  ProjectOpportunityRow,
} from "@/lib/db/types";
import { toUtcDate } from "@/lib/format";
import {
  hydrateCandidateDrafts,
  opportunityDefinition,
} from "@/modules/intelligence/opportunities";
import { requireTenantId } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { getAssessmentDetail } from "@/server/services/assessments";

function asSqlJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function withUtc<T extends { createdAt: Date; updatedAt?: Date }>(row: T): T {
  return {
    ...row,
    createdAt: toUtcDate(row.createdAt),
    ...(row.updatedAt ? { updatedAt: toUtcDate(row.updatedAt) } : {}),
  };
}

function withCatalogCopy(row: OpportunityCandidateRow): OpportunityCandidateRow {
  const definition = opportunityDefinition(row.key);
  if (!definition) {
    return row;
  }

  return {
    ...row,
    consumptionDrivers: definition.consumptionDrivers,
    valueDrivers: definition.valueDrivers,
    constraints: definition.constraints,
    dependencies: definition.dependencies,
  };
}

export async function persistOpportunityCandidates(input: {
  tenantId: string;
  projectId: string;
  assessmentId: string;
  judgments: AssessmentJudgmentRow[];
  priorStatus?: Record<string, CandidateStatus>;
}) {
  const drafts = hydrateCandidateDrafts(input.judgments);
  const scoped = requireTenantId(input.tenantId);

  for (const draft of drafts) {
    const judgment = input.judgments.find(
      (item) => item.kind === "opportunity" && item.key === draft.key,
    );
    const status = input.priorStatus?.[draft.key] ?? "candidate";

    await sql`
      insert into "OpportunityCandidate" (
        id, "tenantId", "projectId", "assessmentId", "judgmentId",
        key, name, description, "candidateType", "businessArea",
        "businessProcess", "recommendedCapability", "supportingSignals",
        evidence, finding, confidence, "consumptionDrivers", "valueDrivers",
        constraints, dependencies, status, "createdAt", "updatedAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${input.projectId},
        ${input.assessmentId},
        ${judgment?.id ?? null},
        ${draft.key},
        ${draft.title},
        ${draft.description},
        ${draft.candidateType},
        ${draft.businessArea},
        ${draft.businessProcess},
        ${draft.recommendedCapability},
        ${sql.json(asSqlJson(draft.supportingSignals))},
        ${sql.json(asSqlJson(draft.evidence))},
        ${draft.finding},
        ${draft.confidence},
        ${sql.json(asSqlJson(draft.consumptionDrivers))},
        ${sql.json(asSqlJson(draft.valueDrivers))},
        ${sql.json(asSqlJson(draft.constraints))},
        ${sql.json(asSqlJson(draft.dependencies))},
        ${status},
        now(),
        now()
      )
      on conflict ("assessmentId", "key") do nothing
    `;
  }
}

export async function ensureOpportunityCandidates(
  tenantId: string,
  assessmentId: string,
) {
  const detail = await getAssessmentDetail(tenantId, assessmentId);
  if (!detail || !detail.assessment.projectId) {
    return [];
  }

  const existing = await listCandidatesForAssessment(tenantId, assessmentId);
  if (existing.length > 0) {
    return existing;
  }

  await persistOpportunityCandidates({
    tenantId,
    projectId: detail.assessment.projectId,
    assessmentId,
    judgments: detail.judgments,
    priorStatus: detail.assessment.summary?.candidates,
  });

  return listCandidatesForAssessment(tenantId, assessmentId);
}

export async function listCandidatesForAssessment(
  tenantId: string,
  assessmentId: string,
) {
  const scoped = requireTenantId(tenantId);
  const rows = await sql<OpportunityCandidateRow[]>`
    select *
    from "OpportunityCandidate"
    where "tenantId" = ${scoped} and "assessmentId" = ${assessmentId}
    order by "createdAt"
  `;
  return rows.map(withUtc).map(withCatalogCopy);
}

export async function listProjectCandidates(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const rows = await sql<OpportunityCandidateRow[]>`
    select *
    from "OpportunityCandidate"
    where "tenantId" = ${scoped} and "projectId" = ${projectId}
    order by "updatedAt" desc
  `;
  return rows.map(withUtc).map(withCatalogCopy);
}

export async function getOpportunityCandidate(
  tenantId: string,
  candidateId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<OpportunityCandidateRow[]>`
    select *
    from "OpportunityCandidate"
    where "tenantId" = ${scoped} and id = ${candidateId}
    limit 1
  `;
  return row ? withCatalogCopy(withUtc(row)) : null;
}

export async function setCandidateLifecycle(input: {
  tenantId: string;
  userId: string;
  candidateId: string;
  status: CandidateStatus;
  rejectionReason?: string;
}) {
  const candidate = await getOpportunityCandidate(
    input.tenantId,
    input.candidateId,
  );
  if (!candidate) {
    return { error: "not-found" as const };
  }

  const scoped = requireTenantId(input.tenantId);
  const promoted = input.status === "promoted";
  const existing = await getOpportunityByCandidate(input.tenantId, candidate.id);

  if (existing && !promoted) {
    await sql`
      delete from "ProjectOpportunity"
      where "tenantId" = ${scoped} and id = ${existing.id}
    `;
    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "opportunity.delete",
      entity: "ProjectOpportunity",
      entityId: existing.id,
      metadata: {
        projectId: candidate.projectId,
        candidateId: candidate.id,
        reason: input.status,
      },
    });
  }

  await sql`
    update "OpportunityCandidate"
    set
      status = ${input.status},
      "rejectionReason" = ${input.rejectionReason ?? candidate.rejectionReason},
      "promotedAt" = case when ${promoted} then now() else null end,
      "promotedBy" = case when ${promoted} then ${input.userId} else null end,
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${candidate.id}
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: `candidate.${input.status}`,
    entity: "OpportunityCandidate",
    entityId: candidate.id,
    metadata: { projectId: candidate.projectId, key: candidate.key },
  });

  if (!promoted) {
    const next = await getOpportunityCandidate(input.tenantId, candidate.id);
    return { candidate: next ?? candidate };
  }

  if (existing) {
    return { candidate, opportunity: existing };
  }

  const [opportunity] = await sql<ProjectOpportunityRow[]>`
    insert into "ProjectOpportunity" (
      id, "tenantId", "projectId", "candidateId", "assessmentId",
      name, description, "businessArea", "businessProcess",
      "recommendedCapability", confidence, "createdAt", "updatedAt"
    )
    values (
      ${createId()},
      ${scoped},
      ${candidate.projectId},
      ${candidate.id},
      ${candidate.assessmentId},
      ${candidate.name},
      ${candidate.description},
      ${candidate.businessArea},
      ${candidate.businessProcess},
      ${candidate.recommendedCapability},
      ${candidate.confidence},
      now(),
      now()
    )
    returning *
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "opportunity.create",
    entity: "ProjectOpportunity",
    entityId: opportunity.id,
    metadata: {
      projectId: candidate.projectId,
      candidateId: candidate.id,
      assessmentId: candidate.assessmentId,
    },
  });

  return {
    candidate,
    opportunity: withUtc(opportunity),
  };
}

export async function listProjectOpportunities(
  tenantId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  const rows = await sql<ProjectOpportunityRow[]>`
    select *
    from "ProjectOpportunity"
    where "tenantId" = ${scoped} and "projectId" = ${projectId}
    order by "createdAt" desc
  `;
  return rows.map(withUtc);
}

export async function getProjectOpportunity(
  tenantId: string,
  opportunityId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<ProjectOpportunityRow[]>`
    select *
    from "ProjectOpportunity"
    where "tenantId" = ${scoped} and id = ${opportunityId}
    limit 1
  `;
  return row ? withUtc(row) : null;
}

export async function getOpportunityByCandidate(
  tenantId: string,
  candidateId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<ProjectOpportunityRow[]>`
    select *
    from "ProjectOpportunity"
    where "tenantId" = ${scoped} and "candidateId" = ${candidateId}
    limit 1
  `;
  return row ? withUtc(row) : null;
}
