"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { startProjectDiscovery } from "@/server/services/assessments";

export async function startDiscoveryAction(formData: FormData) {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const assessment = await startProjectDiscovery({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
  });

  if (!assessment) {
    redirect("/dashboard");
  }

  redirect(`/projects/${projectId}/assessments`);
}
