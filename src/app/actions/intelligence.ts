"use server";

import { requireSession } from "@/lib/auth/session";
import {
  askIntelligence,
  type AskMessage,
} from "@/server/services/intelligence-ask";

export async function askIntelligenceAction(input: {
  projectId: string;
  assessmentId: string;
  question: string;
  history?: AskMessage[];
}): Promise<{ answer?: string; error?: string }> {
  const session = await requireSession();
  const projectId = String(input.projectId ?? "").trim();
  const assessmentId = String(input.assessmentId ?? "").trim();

  if (!projectId || !assessmentId) {
    return { error: "Intelligence run not found." };
  }

  return askIntelligence({
    tenantId: session.tenantId,
    projectId,
    assessmentId,
    question: String(input.question ?? ""),
    history: input.history,
  });
}
