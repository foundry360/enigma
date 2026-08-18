"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { startProjectDiscovery } from "@/server/services/assessments";

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

  redirect(`/projects/${projectId}/intelligence`);
}
