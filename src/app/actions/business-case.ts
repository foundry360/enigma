"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { isScenario } from "@/modules/economics/model";
import { saveBusinessCase } from "@/server/services/business-case";

export async function saveBusinessCaseAction(formData: FormData) {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const scenario = String(formData.get("scenario") ?? "");
  const opportunityIds = formData.getAll("opportunityId").map(String);

  if (!projectId || !isScenario(scenario)) {
    return;
  }

  const result = await saveBusinessCase({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
    scenario,
    monthsAccelerated: readNumber(formData.get("monthsAccelerated")),
    lines: opportunityIds.map((opportunityId) => ({
      opportunityId,
      annualVolume: readNumber(formData.get(`annualVolume:${opportunityId}`)),
      unitPrice: readNumber(formData.get(`unitPrice:${opportunityId}`)),
      hoursSavedPerUnit: readNumber(
        formData.get(`hoursSavedPerUnit:${opportunityId}`),
      ),
      hourlyCost: readNumber(formData.get(`hourlyCost:${opportunityId}`)),
      implementationCost: readNumber(
        formData.get(`implementationCost:${opportunityId}`),
      ),
    })),
  });

  if (!result || "error" in result) {
    return;
  }

  redirect(intelligenceHref(projectId, "business-case"));
}

function readNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}
