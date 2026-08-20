import "server-only";

import { createId, sql } from "@/lib/db/sql";
import type {
  BusinessCaseLineRow,
  BusinessCaseRow,
  BusinessCaseStatus,
  CandidateConfidence,
  CandidateSignalRef,
} from "@/lib/db/types";
import { toUtcDate } from "@/lib/format";
import { toBusinessCaseBriefing } from "@/modules/economics/briefing";
import type { BusinessCaseDetail, BusinessCaseLineView } from "@/modules/economics/case-view";
import {
  baselineFromSnapshot,
  buildDeploymentForecast,
  toBaseline,
  type DeploymentForecast,
} from "@/modules/economics/forecast";
import type { OrgIntelligence } from "@/modules/intelligence/org-model";
import {
  adoptionForScenario,
  defaultAdoption,
  isScenario,
  normalizeAdoption,
  sumProjectInvestment,
  summarizeCase,
  type BusinessCaseDraft,
} from "@/modules/economics/model";
import {
  proposeCaseTiming,
  proposeLineAssumptions,
} from "@/modules/economics/propose";
import { consumptionPosture } from "@/modules/intelligence/consumption";
import {
  expandEvidenceCitations,
  isGroundedExpansion,
} from "@/modules/intelligence/evidence-expand";
import { opportunityDefinition } from "@/modules/intelligence/opportunities";
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

export type { BusinessCaseDetail, BusinessCaseLineView, BusinessCaseDraft };

type LineJoinRow = BusinessCaseLineRow & {
  opportunityName: string;
  businessArea: string;
  businessProcess: string;
  recommendedCapability: string;
  candidateKey: string;
  confidence: CandidateConfidence;
  finding: string;
  supportingSignals: CandidateSignalRef[];
  evidence: { tool: string; citation: string; expansion?: string }[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies: string[];
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
        id, "tenantId", "projectId", scenario, status,
        "conservativeAdoption", "expectedAdoption", "aggressiveAdoption",
        "createdAt", "updatedAt"
      )
      values (
        ${createId()},
        ${scoped},
        ${projectId},
        'expected',
        'draft',
        ${defaultAdoption.conservative},
        ${defaultAdoption.expected},
        ${defaultAdoption.aggressive},
        now(),
        now()
      )
      on conflict ("projectId") do nothing
      returning *
    `;
    businessCase = created
      ? withCase(created)
      : await getBusinessCase(tenantId, projectId);
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

  const loaded = await loadBusinessCase(tenantId, businessCase.id);
  return loaded ? seedDecipheredAssumptions(tenantId, loaded) : null;
}

export async function saveBusinessCase(input: {
  tenantId: string;
  userId: string;
  projectId: string;
  draft: BusinessCaseDraft;
  refreshRecommendation?: boolean;
}) {
  const detail = await ensureBusinessCase(input.tenantId, input.projectId);
  if (!detail) {
    return { error: "not-found" as const };
  }

  if (detail.businessCase.status === "approved") {
    return { error: "locked" as const };
  }

  if (!isScenario(input.draft.scenario)) {
    return { error: "invalid" as const };
  }

  const scoped = requireTenantId(input.tenantId);
  const allowed = new Set(detail.lines.map((line) => line.opportunityId));
  const adoption = normalizeAdoption({
    conservative: input.draft.conservativeAdoption,
    expected: input.draft.expectedAdoption,
    aggressive: input.draft.aggressiveAdoption,
  });

  await sql`
    update "BusinessCase"
    set
      scenario = ${input.draft.scenario},
      "conservativeAdoption" = ${adoption.conservative},
      "expectedAdoption" = ${adoption.expected},
      "aggressiveAdoption" = ${adoption.aggressive},
      "baselineDays" = ${input.draft.baselineDays},
      "enigmaDays" = ${input.draft.enigmaDays},
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${detail.businessCase.id}
  `;

  for (const line of input.draft.lines) {
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
    metadata: { projectId: input.projectId, scenario: input.draft.scenario },
  });

  let next = await loadBusinessCase(input.tenantId, detail.businessCase.id);
  if (input.refreshRecommendation && next) {
    next = await persistRecommendation(input.tenantId, next, { force: true });
  }

  return next;
}

export async function approveBusinessCase(input: {
  tenantId: string;
  userId: string;
  projectId: string;
}) {
  const detail = await ensureBusinessCase(input.tenantId, input.projectId);
  if (!detail) {
    return { error: "not-found" as const };
  }

  if (!detail.rollup.complete || detail.gaps.length > 0) {
    return { error: "incomplete" as const };
  }

  const scoped = requireTenantId(input.tenantId);
  await sql`
    update "BusinessCase"
    set
      status = 'approved',
      "predictedSnapshot" = ${sql.json({
        rollup: detail.rollup,
        recommendationState: detail.recommendationState,
        recommendationNarrative: detail.businessCase.recommendationNarrative,
        justificationNarrative: detail.businessCase.justificationNarrative,
        intelligenceNarrative: detail.businessCase.intelligenceNarrative,
        forecastBaseline: toBaseline(
          toDeploymentForecast(detail, {
            org: null,
            environmentName: null,
          }).scenarios[detail.businessCase.scenario],
        ),
      })},
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${detail.businessCase.id}
  `;

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "businessCase.approve",
    entity: "BusinessCase",
    entityId: detail.businessCase.id,
    metadata: { projectId: input.projectId },
  });

  return loadBusinessCase(input.tenantId, detail.businessCase.id);
}

export async function persistRecommendation(
  tenantId: string,
  detail: BusinessCaseDetail,
  options?: { force?: boolean },
) {
  const {
    caseStoryScope,
    shouldRefreshCaseStories,
    withStoryScope,
  } = await import("@/modules/economics/story-slots");
  const opportunityIds = detail.lines.map((line) => line.opportunityId);
  if (
    !shouldRefreshCaseStories({
      force: options?.force,
      justification: detail.businessCase.justificationNarrative,
      recommendation: detail.businessCase.recommendationNarrative,
      intelligence: detail.businessCase.intelligenceNarrative,
      opportunityIds,
    })
  ) {
    return detail;
  }

  const { explainBusinessCase } = await import(
    "@/server/services/business-case-ask"
  );
  const explained = await explainBusinessCase(buildCaseBriefing(detail));
  const scoped = requireTenantId(tenantId);
  const intelligenceNarrative = withStoryScope(
    explained.intelligenceNarrative,
    caseStoryScope(opportunityIds),
  );

  await sql`
    update "BusinessCase"
    set
      "recommendationState" = ${explained.recommendationState},
      "recommendationNarrative" = ${explained.recommendationNarrative},
      "justificationNarrative" = ${explained.justificationNarrative},
      "intelligenceNarrative" = ${intelligenceNarrative},
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${detail.businessCase.id}
  `;

  return loadBusinessCase(tenantId, detail.businessCase.id);
}

export async function invalidateBusinessCaseStories(
  tenantId: string,
  projectId: string,
) {
  const scoped = requireTenantId(tenantId);
  await sql`
    update "BusinessCase"
    set
      "recommendationNarrative" = null,
      "justificationNarrative" = null,
      "intelligenceNarrative" = null,
      "updatedAt" = now()
    where "tenantId" = ${scoped}
      and "projectId" = ${projectId}
      and status <> 'approved'
  `;
}

export async function persistEvidenceExpansions(
  tenantId: string,
  detail: BusinessCaseDetail,
) {
  const { expandCaseEvidence } = await import(
    "@/server/services/business-case-ask"
  );
  const scoped = requireTenantId(tenantId);

  for (const line of detail.lines) {
    if (line.evidence.length === 0) {
      continue;
    }

    const citations = line.evidence.map((entry) => entry.citation);
    const fallback = expandEvidenceCitations({
      citations,
      signals: line.supportingSignals,
    });
    const modeled = await expandCaseEvidence({
      name: line.opportunityName,
      citations,
      signals: line.supportingSignals,
    });

    const next = line.evidence.map((entry) => {
      const modeledText = modeled?.[entry.citation];
      const fallbackText = fallback.find((item) => item.citation === entry.citation)
        ?.expansion;
      const expansion =
        modeledText && isGroundedExpansion(entry.citation, modeledText)
          ? modeledText
          : entry.expansion || fallbackText;

      return {
        tool: entry.tool,
        citation: entry.citation,
        ...(expansion ? { expansion } : {}),
      };
    });

    await sql`
      update "OpportunityCandidate" c
      set
        evidence = ${sql.json(JSON.parse(JSON.stringify(next)))},
        "updatedAt" = now()
      from "ProjectOpportunity" o
      where o."candidateId" = c.id
        and o.id = ${line.opportunityId}
        and c."tenantId" = ${scoped}
    `;
  }

  return loadBusinessCase(tenantId, detail.businessCase.id);
}

function asNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function projectInvestmentTotal(
  project: {
    discoveryCost: number | string | null;
    implementationCost: number | string | null;
    knowledgeCost: number | string | null;
    changeManagementCost: number | string | null;
    servicesCost: number | string | null;
    otherCost: number | string | null;
  } | null,
) {
  if (!project) {
    return null;
  }

  return sumProjectInvestment({
    discovery: asNumber(project.discoveryCost),
    implementation: asNumber(project.implementationCost),
    knowledge: asNumber(project.knowledgeCost),
    change: asNumber(project.changeManagementCost),
    services: asNumber(project.servicesCost),
    other: asNumber(project.otherCost),
  });
}

function withCase(row: BusinessCaseRow): BusinessCaseRow {
  const rates = normalizeAdoption({
    conservative:
      asNumber(row.conservativeAdoption) ?? defaultAdoption.conservative,
    expected: asNumber(row.expectedAdoption) ?? defaultAdoption.expected,
    aggressive: asNumber(row.aggressiveAdoption) ?? defaultAdoption.aggressive,
  });
  return {
    ...withUtc(row),
    conservativeAdoption: rates.conservative,
    expectedAdoption: rates.expected,
    aggressiveAdoption: rates.aggressive,
    baselineDays: asNumber(row.baselineDays),
    enigmaDays: asNumber(row.enigmaDays),
    status: (row.status ?? "draft") as BusinessCaseStatus,
    justificationNarrative: row.justificationNarrative ?? null,
  };
}

export async function getBusinessCase(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<BusinessCaseRow[]>`
    select *
    from "BusinessCase"
    where "tenantId" = ${scoped} and "projectId" = ${projectId}
    limit 1
  `;
  return row ? withCase(row) : null;
}

export function caseAdoption(businessCase: BusinessCaseRow) {
  return adoptionForScenario(businessCase.scenario, {
    conservative: businessCase.conservativeAdoption,
    expected: businessCase.expectedAdoption,
    aggressive: businessCase.aggressiveAdoption,
  });
}

export function buildCaseBriefing(detail: BusinessCaseDetail) {
  return toBusinessCaseBriefing({
    opportunities: detail.lines.map((line) => ({
      name: line.opportunityName,
      process: line.businessProcess,
      capability: line.recommendedCapability,
      confidence: line.confidence,
      finding: line.finding,
      signals: line.supportingSignals.map((signal) => ({
        key: signal.key,
        title: signal.title,
        strength: signal.strength,
      })),
      evidence: line.evidence.map((entry) => entry.citation),
      consumptionDrivers: line.consumptionDrivers,
      valueDrivers: line.valueDrivers,
      constraints: line.constraints,
      dependencies: line.dependencies,
      annualVolume: line.annualVolume,
      unitPrice: line.unitPrice,
      hoursSavedPerUnit: line.hoursSavedPerUnit,
      hourlyCost: line.hourlyCost,
    })),
    scenario: detail.businessCase.scenario,
    adoption: caseAdoption(detail.businessCase),
    baselineDays: detail.businessCase.baselineDays,
    enigmaDays: detail.businessCase.enigmaDays,
    implementation: detail.rollup.implementation,
    rollup: detail.rollup,
    gaps: detail.gaps,
    recommendationState: detail.recommendationState,
    hasWeakSignals: detail.lines.some((line) =>
      line.supportingSignals.some((signal) => signal.strength === "weak"),
    ),
    weakSignals: detail.lines.flatMap((line) =>
      line.supportingSignals
        .filter((signal) => signal.strength === "weak")
        .map((signal) => signal.title),
    ),
    confidence: rollupConfidence(detail.lines.map((line) => line.confidence)),
  });
}

export function toDeploymentForecast(
  detail: BusinessCaseDetail | null,
  input: {
    org: OrgIntelligence | null;
    environmentName: string | null;
  },
): DeploymentForecast {
  const line = detail?.lines[0] ?? null;
  const weakSignals =
    detail?.lines.flatMap((item) =>
      item.supportingSignals
        .filter((signal) => signal.strength === "weak")
        .map((signal) => signal.title),
    ) ?? [];

  return buildDeploymentForecast({
    caseStatus: !detail
      ? "planning"
      : detail.businessCase.status === "approved"
        ? "approved"
        : detail.rollup.complete
          ? "saved"
          : "planning",
    selectedScenario: detail?.businessCase.scenario ?? "expected",
    conservativeAdoption: detail?.businessCase.conservativeAdoption ?? null,
    expectedAdoption: detail?.businessCase.expectedAdoption ?? null,
    aggressiveAdoption: detail?.businessCase.aggressiveAdoption ?? null,
    lines:
      detail?.lines.map((item) => ({
        annualVolume: item.annualVolume,
        unitPrice: item.unitPrice,
        hoursSavedPerUnit: item.hoursSavedPerUnit,
        hourlyCost: item.hourlyCost,
        implementationCost: item.implementationCost,
      })) ?? [],
    opportunity: line
      ? {
          name: line.opportunityName,
          key: line.candidateKey,
          finding: line.finding,
          area: line.businessArea,
          process: line.businessProcess,
          capability: line.recommendedCapability,
          confidence: line.confidence,
          constraints: line.constraints,
          dependencies: line.dependencies,
        }
      : null,
    recommendationState: detail?.recommendationState ?? "do_not_proceed",
    gaps: detail?.gaps ?? [],
    hasWeakSignals: weakSignals.length > 0,
    weakSignals,
    environmentName: input.environmentName,
    org: input.org,
    storedBaseline: baselineFromSnapshot(
      detail?.businessCase.predictedSnapshot ?? null,
    ),
  });
}

export async function getBusinessCaseDetail(
  tenantId: string,
  projectId: string,
) {
  const businessCase = await getBusinessCase(tenantId, projectId);
  if (!businessCase) {
    return null;
  }

  return loadBusinessCase(tenantId, businessCase.id);
}

async function seedDecipheredAssumptions(
  tenantId: string,
  detail: BusinessCaseDetail,
) {
  const scoped = requireTenantId(tenantId);
  const project = await getProject(tenantId, detail.businessCase.projectId);
  let changed = false;

  const nextConservative =
    project?.conservativeAdoption ??
    detail.businessCase.conservativeAdoption ??
    null;
  const nextExpected =
    project?.expectedAdoption ?? detail.businessCase.expectedAdoption ?? null;
  const nextAggressive =
    project?.aggressiveAdoption ??
    detail.businessCase.aggressiveAdoption ??
    null;
  const nextBaseline =
    project?.baselineDays ?? detail.businessCase.baselineDays ?? null;
  const nextEnigmaDays =
    project?.enigmaDays ?? detail.businessCase.enigmaDays ?? null;

  if (
    nextConservative !== detail.businessCase.conservativeAdoption ||
    nextExpected !== detail.businessCase.expectedAdoption ||
    nextAggressive !== detail.businessCase.aggressiveAdoption ||
    nextBaseline !== detail.businessCase.baselineDays ||
    nextEnigmaDays !== detail.businessCase.enigmaDays
  ) {
    await sql`
      update "BusinessCase"
      set
        "conservativeAdoption" = ${nextConservative},
        "expectedAdoption" = ${nextExpected},
        "aggressiveAdoption" = ${nextAggressive},
        "baselineDays" = ${nextBaseline},
        "enigmaDays" = ${nextEnigmaDays},
        "updatedAt" = now()
      where "tenantId" = ${scoped} and id = ${detail.businessCase.id}
    `;
    changed = true;
  }

  for (const line of detail.lines) {
    const annualVolume = project?.annualVolume ?? line.annualVolume ?? null;
    const unitPrice = project?.unitPrice ?? line.unitPrice ?? null;
    const hoursSavedPerUnit =
      project?.hoursSavedPerUnit ?? line.hoursSavedPerUnit ?? null;
    const hourlyCost = project?.hourlyCost ?? line.hourlyCost ?? null;

    if (
      annualVolume === line.annualVolume &&
      unitPrice === line.unitPrice &&
      hoursSavedPerUnit === line.hoursSavedPerUnit &&
      hourlyCost === line.hourlyCost
    ) {
      continue;
    }

    await sql`
      update "BusinessCaseLine"
      set
        "annualVolume" = ${annualVolume},
        "unitPrice" = ${unitPrice},
        "hoursSavedPerUnit" = ${hoursSavedPerUnit},
        "hourlyCost" = ${hourlyCost},
        "updatedAt" = now()
      where "tenantId" = ${scoped} and id = ${line.id}
    `;
    changed = true;
  }

  const projectInvestment = projectInvestmentTotal(project);
  for (const [index, line] of detail.lines.entries()) {
    const nextCost =
      projectInvestment == null ? null : index === 0 ? projectInvestment : 0;
    if (line.implementationCost === nextCost) {
      continue;
    }

    await sql`
      update "BusinessCaseLine"
      set
        "implementationCost" = ${nextCost},
        "updatedAt" = now()
      where "tenantId" = ${scoped} and id = ${line.id}
    `;
    changed = true;
  }

  return changed ? loadBusinessCase(tenantId, detail.businessCase.id) : detail;
}

async function employeeRangeForProject(tenantId: string, projectId: string) {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<{ employeeRange: string | null }[]>`
    select o."employeeRange"
    from "Organization" o
    join "Project" p
      on p."organizationId" = o.id and p."tenantId" = o."tenantId"
    where p."tenantId" = ${scoped} and p.id = ${projectId}
    limit 1
  `;
  return row?.employeeRange ?? null;
}

async function loadBusinessCase(
  tenantId: string,
  businessCaseId: string,
): Promise<BusinessCaseDetail | null> {
  const scoped = requireTenantId(tenantId);
  const [row] = await sql<BusinessCaseRow[]>`
    select *
    from "BusinessCase"
    where "tenantId" = ${scoped} and id = ${businessCaseId}
    limit 1
  `;

  if (!row) {
    return null;
  }

  const businessCase = withCase(row);
  const [employeeRange, project] = await Promise.all([
    employeeRangeForProject(tenantId, businessCase.projectId),
    getProject(tenantId, businessCase.projectId),
  ]);
  const rows = await sql<LineJoinRow[]>`
    select
      l.*,
      o.name as "opportunityName",
      o."businessArea",
      o."businessProcess",
      o."recommendedCapability",
      o.confidence,
      c.key as "candidateKey",
      c.finding,
      c."supportingSignals",
      c.evidence,
      c."consumptionDrivers",
      c."valueDrivers",
      c.constraints,
      c.dependencies
    from "BusinessCaseLine" l
    join "ProjectOpportunity" o
      on o.id = l."opportunityId" and o."tenantId" = l."tenantId"
    join "OpportunityCandidate" c
      on c.id = o."candidateId" and c."tenantId" = l."tenantId"
    where l."tenantId" = ${scoped} and l."businessCaseId" = ${businessCaseId}
    order by o."createdAt"
  `;

  const lines = rows.map((joined) => {
    const definition = opportunityDefinition(joined.candidateKey);
    const {
      opportunityName,
      businessArea,
      businessProcess,
      recommendedCapability,
      candidateKey,
      confidence,
      finding,
      supportingSignals,
      evidence,
      consumptionDrivers,
      valueDrivers,
      constraints,
      dependencies,
      ...line
    } = joined;

    const nextConstraints =
      definition?.constraints ??
      (Array.isArray(constraints) ? constraints : []);
    const nextSignals = Array.isArray(supportingSignals)
      ? supportingSignals
      : [];

    return {
      ...withUtc(line),
      annualVolume: asNumber(line.annualVolume),
      unitPrice: asNumber(line.unitPrice),
      hoursSavedPerUnit: asNumber(line.hoursSavedPerUnit),
      hourlyCost: asNumber(line.hourlyCost),
      implementationCost: asNumber(line.implementationCost),
      opportunityName,
      businessArea,
      businessProcess,
      recommendedCapability,
      candidateKey,
      unitHint: consumptionPosture({ key: candidateKey, score: 0 }).unitHint,
      confidence,
      finding,
      supportingSignals: nextSignals,
      evidence: Array.isArray(evidence) ? evidence : [],
      consumptionDrivers:
        definition?.consumptionDrivers ??
        (Array.isArray(consumptionDrivers) ? consumptionDrivers : []),
      valueDrivers:
        definition?.valueDrivers ??
        (Array.isArray(valueDrivers) ? valueDrivers : []),
      constraints: nextConstraints,
      dependencies:
        definition?.dependencies ??
        (Array.isArray(dependencies) ? dependencies : []),
      proposed: proposeLineAssumptions({
        candidateKey,
        confidence,
        signals: nextSignals,
        constraintCount: nextConstraints.length,
        employeeRange,
      }),
    };
  });

  const summary = summarizeCase({
    lines,
    scenario: businessCase.scenario,
    conservativeAdoption: businessCase.conservativeAdoption,
    expectedAdoption: businessCase.expectedAdoption,
    aggressiveAdoption: businessCase.aggressiveAdoption,
    baselineDays: businessCase.baselineDays,
    enigmaDays: businessCase.enigmaDays,
    implementationCost: projectInvestmentTotal(project),
    hasWeakSignals: lines.some((line) =>
      line.supportingSignals.some((signal) => signal.strength === "weak"),
    ),
    confidence: rollupConfidence(lines.map((line) => line.confidence)),
  });

  return {
    businessCase,
    lines,
    rollup: summary.rollup,
    gaps: summary.gaps,
    recommendationState: summary.recommendationState,
    proposedCase: proposeCaseTiming({
      confidence: rollupConfidence(lines.map((line) => line.confidence)),
      signals: lines.flatMap((line) => line.supportingSignals),
      constraintCount: Math.max(
        0,
        ...lines.map((line) => line.constraints.length),
      ),
    }),
  };
}

function rollupConfidence(values: CandidateConfidence[]) {
  if (values.includes("high")) {
    return "high" as const;
  }
  if (values.includes("medium")) {
    return "medium" as const;
  }
  return values[0] ?? null;
}
