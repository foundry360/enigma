import { createId, sql } from "@/lib/db/sql";
import type {
  BusinessCaseLineRow,
  BusinessCaseRow,
  BusinessCaseScenario,
} from "@/lib/db/types";
import { toUtcDate } from "@/lib/format";
import {
  consumptionPosture,
} from "@/modules/intelligence/consumption";
import {
  isScenario,
  rollUpCase,
  type CaseRollup,
  type LineAssumptions,
} from "@/modules/economics/model";
import { requireTenantId } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import { getProject } from "@/server/services/projects";
import { listProjectOpportunities } from "@/server/services/opportunities";

function withUtc<T extends { createdAt: Date; updatedAt?: Date }>(row: T): T {
  return {
    ...row,
    createdAt: toUtcDate(row.createdAt),
    ...(row.updatedAt ? { updatedAt: toUtcDate(row.updatedAt) } : {}),
  };
}

export type BusinessCaseLineView = BusinessCaseLineRow & {
  opportunityName: string;
  businessArea: string;
  recommendedCapability: string;
  candidateKey: string;
  unitHint: string;
};

export type BusinessCaseDetail = {
  businessCase: BusinessCaseRow;
  lines: BusinessCaseLineView[];
  rollup: CaseRollup;
};

type LineJoinRow = BusinessCaseLineRow & {
  opportunityName: string;
  businessArea: string;
  recommendedCapability: string;
  candidateKey: string;
};

export async function ensureBusinessCase(
  tenantId: string,
  projectId: string,
): Promise<BusinessCaseDetail | null> {
  const project = await getProject(tenantId, projectId);
  if (!project) {
    return null;
  }

  const opportunities = await listProjectOpportunities(tenantId, projectId);
  if (opportunities.length === 0) {
    return null;
  }

  const scoped = requireTenantId(tenantId);
  let businessCase = await getBusinessCase(tenantId, projectId);

  if (!businessCase) {
    const [created] = await sql<BusinessCaseRow[]>`
      insert into "BusinessCase" (
        id, "tenantId", "projectId", scenario, "createdAt", "updatedAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${projectId},
        'expected',
        now(),
        now()
      )
      on conflict ("projectId") do nothing
      returning *
    `;
    businessCase = created ? withUtc(created) : await getBusinessCase(tenantId, projectId);
  }

  if (!businessCase) {
    return null;
  }

  for (const opportunity of opportunities) {
    await sql`
      insert into "BusinessCaseLine" (
        id, "tenantId", "businessCaseId", "opportunityId",
        "createdAt", "updatedAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${businessCase.id},
        ${opportunity.id},
        now(),
        now()
      )
      on conflict ("opportunityId") do nothing
    `;
  }

  return loadBusinessCase(tenantId, businessCase.id);
}

export async function saveBusinessCase(input: {
  tenantId: string;
  userId: string;
  projectId: string;
  scenario: BusinessCaseScenario;
  monthsAccelerated: number | null;
  lines: Array<{ opportunityId: string } & LineAssumptions>;
}) {
  const detail = await ensureBusinessCase(input.tenantId, input.projectId);
  if (!detail) {
    return { error: "not-found" as const };
  }

  if (!isScenario(input.scenario)) {
    return { error: "invalid" as const };
  }

  const scoped = requireTenantId(input.tenantId);
  const allowed = new Set(detail.lines.map((line) => line.opportunityId));

  await sql`
    update "BusinessCase"
    set
      scenario = ${input.scenario},
      "monthsAccelerated" = ${input.monthsAccelerated},
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${detail.businessCase.id}
  `;

  for (const line of input.lines) {
    if (!allowed.has(line.opportunityId)) {
      continue;
    }

    await sql`
      update "BusinessCaseLine"
      set
        "annualVolume" = ${line.annualVolume},
        "unitPrice" = ${line.unitPrice},
        "hoursSavedPerUnit" = ${line.hoursSavedPerUnit},
        "hourlyCost" = ${line.hourlyCost},
        "implementationCost" = ${line.implementationCost},
        "updatedAt" = now()
      where "tenantId" = ${scoped}
        and "businessCaseId" = ${detail.businessCase.id}
        and "opportunityId" = ${line.opportunityId}
    `;
  }

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "businessCase.update",
    entity: "BusinessCase",
    entityId: detail.businessCase.id,
    metadata: { projectId: input.projectId, scenario: input.scenario },
  });

  return loadBusinessCase(input.tenantId, detail.businessCase.id);
}

function asNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getBusinessCase(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<BusinessCaseRow[]>`
    select *
    from "BusinessCase"
    where "tenantId" = ${scoped} and "projectId" = ${projectId}
    limit 1
  `;
  return row ? withUtc(row) : null;
}

async function loadBusinessCase(
  tenantId: string,
  businessCaseId: string,
): Promise<BusinessCaseDetail | null> {
  const scoped = requireTenantId(tenantId);
  const [businessCase] = await sql<BusinessCaseRow[]>`
    select *
    from "BusinessCase"
    where "tenantId" = ${scoped} and id = ${businessCaseId}
    limit 1
  `;

  if (!businessCase) {
    return null;
  }

  const rows = await sql<LineJoinRow[]>`
    select
      l.*,
      o.name as "opportunityName",
      o."businessArea",
      o."recommendedCapability",
      c.key as "candidateKey"
    from "BusinessCaseLine" l
    join "ProjectOpportunity" o
      on o.id = l."opportunityId" and o."tenantId" = l."tenantId"
    join "OpportunityCandidate" c
      on c.id = o."candidateId" and c."tenantId" = l."tenantId"
    where l."tenantId" = ${scoped} and l."businessCaseId" = ${businessCaseId}
    order by o."createdAt"
  `;

  const lines = rows.map((row) => {
    const { opportunityName, businessArea, recommendedCapability, candidateKey, ...line } = row;
    return {
      ...withUtc(line),
      annualVolume: asNumber(line.annualVolume),
      unitPrice: asNumber(line.unitPrice),
      hoursSavedPerUnit: asNumber(line.hoursSavedPerUnit),
      hourlyCost: asNumber(line.hourlyCost),
      implementationCost: asNumber(line.implementationCost),
      opportunityName,
      businessArea,
      recommendedCapability,
      candidateKey,
      unitHint: consumptionPosture({ key: candidateKey, score: 0 }).unitHint,
    };
  });

  return {
    businessCase: withUtc(businessCase),
    lines,
    rollup: rollUpCase({
      lines,
      scenario: businessCase.scenario,
      monthsAccelerated: asNumber(businessCase.monthsAccelerated),
    }),
  };
}
