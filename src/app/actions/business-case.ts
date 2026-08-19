"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { isScenario } from "@/modules/economics/model";
import type { BusinessCaseDraft } from "@/modules/economics/model";
import {
  approveBusinessCase,
  getBusinessCaseDetail,
  persistEvidenceExpansions,
  persistRecommendation,
  saveBusinessCase,
} from "@/server/services/business-case";

export async function saveBusinessCaseAction(input: {
  projectId: string;
  draft: BusinessCaseDraft;
  refreshRecommendation?: boolean;
}) {
  const session = await requireSession();
  if (!input.projectId || !isScenario(input.draft.scenario)) {
    return { error: "invalid" as const };
  }

  const result = await saveBusinessCase({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId: input.projectId,
    draft: input.draft,
    refreshRecommendation: input.refreshRecommendation,
  });

  if (!result || "error" in result) {
    return { error: result && "error" in result ? result.error : "invalid" };
  }

  revalidatePath(intelligenceHref(input.projectId, "business-case"));
  revalidatePath(intelligenceHref(input.projectId, "deployment"));
  return { ok: true as const, detail: result };
}

export async function refreshBusinessCaseNarrativesAction(projectId: string) {
  const session = await requireSession();
  const detail = await getBusinessCaseDetail(session.tenantId, projectId);
  if (!detail) {
    return { error: "not-found" as const };
  }

  if (detail.businessCase.status === "approved") {
    return { error: "locked" as const };
  }

  if (!detail.rollup.complete) {
    return { ok: true as const, detail };
  }

  const next = await persistRecommendation(session.tenantId, detail);
  if (!next) {
    return { error: "invalid" as const };
  }

  return { ok: true as const, detail: next };
}

export async function expandBusinessCaseEvidenceAction(projectId: string) {
  const session = await requireSession();
  const detail = await getBusinessCaseDetail(session.tenantId, projectId);
  if (!detail) {
    return { error: "not-found" as const };
  }

  const needsExpansion = detail.lines.some((line) =>
    line.evidence.some((entry) => !entry.expansion),
  );
  if (!needsExpansion) {
    return { ok: true as const, detail };
  }

  const next = await persistEvidenceExpansions(session.tenantId, detail);
  if (!next) {
    return { error: "invalid" as const };
  }

  return { ok: true as const, detail: next };
}

export async function approveBusinessCaseAction(projectId: string) {
  const session = await requireSession();
  const result = await approveBusinessCase({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
  });

  if (!result || "error" in result) {
    return { error: result && "error" in result ? result.error : "invalid" };
  }

  revalidatePath(intelligenceHref(projectId, "business-case"));
  revalidatePath(intelligenceHref(projectId, "deployment"));
  return { ok: true as const, detail: result };
}
