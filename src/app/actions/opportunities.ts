"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import type { CandidateStatus } from "@/lib/db/types";
import { setCandidateLifecycle } from "@/server/services/opportunities";

export async function updateCandidateAction(formData: FormData) {
  const session = await requireSession();
  const candidateId = String(formData.get("candidateId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "") as CandidateStatus;
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

  if (
    status !== "candidate" &&
    status !== "validated" &&
    status !== "rejected" &&
    status !== "promoted"
  ) {
    return;
  }

  const result = await setCandidateLifecycle({
    tenantId: session.tenantId,
    userId: session.userId,
    candidateId,
    status,
    rejectionReason: status === "rejected" ? rejectionReason || undefined : undefined,
  });

  if ("error" in result) {
    return;
  }

  if (result.opportunity) {
    redirect(`/projects/${projectId}/opportunities?opportunity=${result.opportunity.id}`);
  }

  redirect(`/projects/${projectId}/opportunities?candidate=${candidateId}`);
}
