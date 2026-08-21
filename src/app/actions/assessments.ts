"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import {
  getDiscoveryProgress,
  setOpportunityCandidateStatus,
  startProjectDiscovery,
} from "@/server/services/assessments";

export async function startDiscoveryAction(formData: FormData) {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const result = await startProjectDiscovery({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
  });

  if ("error" in result && result.error === "not-found") {
    redirect("/dashboard");
  }

  if (
    "error" in result &&
    (result.error === "needs-connection" || result.error === "expired")
  ) {
    redirect(`/projects/${projectId}/connections?salesforce=expired`);
  }

  if (projectId) {
    revalidatePath(intelligenceHref(projectId));
    revalidatePath(intelligenceHref(projectId, "business-case"));
    revalidatePath(intelligenceHref(projectId, "opportunities"));
    revalidatePath(intelligenceHref(projectId, "deployment"));
  }

  return { ok: true as const, projectId };
}

export async function getDiscoveryProgressAction(projectId: string) {
  const session = await requireSession();
  if (!projectId) {
    return null;
  }

  return getDiscoveryProgress(session.tenantId, projectId);
}

export async function setCandidateStatusAction(formData: FormData) {
  const session = await requireSession();
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const key = String(formData.get("key") ?? "");
  const status = String(formData.get("status") ?? "");

  if (
    status !== "candidate" &&
    status !== "promoted" &&
    status !== "rejected"
  ) {
    return;
  }

  const result = await setOpportunityCandidateStatus({
    tenantId: session.tenantId,
    assessmentId,
    key,
    status,
  });

  if ("error" in result || !result.assessment.projectId) {
    return;
  }

  redirect(
    intelligenceHref(result.assessment.projectId, "opportunities"),
  );
}
