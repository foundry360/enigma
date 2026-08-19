"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { isScenario } from "@/modules/economics/model";
import type { BusinessCaseDraft } from "@/modules/economics/model";
import {
  approveBusinessCase,
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
  return { ok: true as const, detail: result };
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
