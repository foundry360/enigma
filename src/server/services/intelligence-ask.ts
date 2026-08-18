import "server-only";

import {
  answerFromBriefing,
  briefingToPrompt,
  buildIntelligenceBriefing,
  isPriceAsk,
} from "@/modules/intelligence/briefing";
import { getProjectAssessmentDetail } from "@/server/services/assessments";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { ensureOpportunityCandidates } from "@/server/services/opportunities";

export type AskMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askIntelligence(input: {
  tenantId: string;
  projectId: string;
  assessmentId: string;
  question: string;
  history?: AskMessage[];
}) {
  const question = input.question.trim().slice(0, 2000);
  if (!question) {
    return { error: "Ask about a signal, a candidate, or this run." };
  }

  const detail = await getProjectAssessmentDetail(
    input.tenantId,
    input.projectId,
    input.assessmentId,
  );

  if (!detail) {
    return { error: "Intelligence run not found." };
  }

  if (detail.assessment.status !== "COMPLETE") {
    return { error: "This run is not complete yet." };
  }

  const [candidates, org] = await Promise.all([
    ensureOpportunityCandidates(input.tenantId, detail.assessment.id),
    detail.assessment.connectionId
      ? getConnectionOrgProfile(
          input.tenantId,
          detail.assessment.connectionId,
        )
      : Promise.resolve(null),
  ]);

  const briefing = buildIntelligenceBriefing({
    environment: org?.name ?? "Connected environment",
    status: detail.assessment.status,
    factCount: detail.traces.length,
    signals: detail.judgments.filter((item) => item.kind === "dimension"),
    candidates,
  });

  const grounded = answerFromBriefing(question, briefing);
  if (isPriceAsk(question)) {
    return { answer: grounded };
  }

  const modeled = await explainWithModel(
    question,
    briefingToPrompt(briefing),
    sanitizeHistory(input.history),
  );

  return { answer: modeled ?? grounded };
}

function sanitizeHistory(history: AskMessage[] | undefined): AskMessage[] {
  return (history ?? [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter((message) => message.content.length > 0);
}

async function explainWithModel(
  question: string,
  briefing: string,
  history: AskMessage[],
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You explain a completed Enigma Intelligence run.",
              "Use only the briefing. Do not invent scores, volumes, prices, licenses, or ROI.",
              "If the briefing does not contain the answer, say so.",
              "Cite evidence citations when they exist.",
              "Consumption drivers are hypotheses, not forecasts.",
              "Do not mention tokens, OAuth, or raw platform payloads.",
              "",
              briefing,
            ].join("\n"),
          },
          ...history,
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}
