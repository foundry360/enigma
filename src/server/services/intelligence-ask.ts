import "server-only";

import { formatAskAnswer, looksLikeAskDump } from "@/modules/intelligence/ask-format";
import { buildIntelligenceBriefing } from "@/modules/intelligence/briefing";
import { opportunityDefinition } from "@/modules/intelligence/opportunities";
import {
  answerProjectAsk,
  hasScriptedProjectAnswer,
  projectAskPrompt,
  resolveAskQuestion,
} from "@/modules/intelligence/project-ask";
import { getProjectAssessmentDetail } from "@/server/services/assessments";
import {
  buildCaseBriefing,
  getBusinessCaseDetail,
} from "@/server/services/business-case";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { completeChat } from "@/server/services/inference";
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
    return { error: "Ask about this project's signals, opportunities, case, or next step." };
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

  const [candidates, org, businessCase] = await Promise.all([
    ensureOpportunityCandidates(input.tenantId, detail.assessment.id),
    detail.assessment.connectionId
      ? getConnectionOrgProfile(
          input.tenantId,
          detail.assessment.connectionId,
        )
      : Promise.resolve(null),
    getBusinessCaseDetail(input.tenantId, input.projectId),
  ]);

  const intelligence = buildIntelligenceBriefing({
    environment: org?.name ?? "Connected environment",
    status: detail.assessment.status,
    factCount: detail.traces.length,
    signals: detail.judgments.filter((item) => item.kind === "dimension"),
    candidates: candidates.map((candidate) => {
      const definition = opportunityDefinition(candidate.key);
      return {
        name: candidate.name,
        description: candidate.description,
        finding: candidate.finding,
        confidence: candidate.confidence,
        status: candidate.status,
        supportingSignals: candidate.supportingSignals,
        evidence: candidate.evidence,
        consumptionDrivers: candidate.consumptionDrivers,
        valueDrivers: candidate.valueDrivers,
        constraints: candidate.constraints,
        dependencies: candidate.dependencies,
        risk: definition?.risk ?? "",
        recommendation: definition?.recommendation ?? "",
      };
    }),
  });

  const briefing = {
    intelligence,
    businessCase: businessCase ? buildCaseBriefing(businessCase) : null,
  };

  const history = sanitizeHistory(input.history);
  const resolved = resolveAskQuestion(question, history);
  const grounded = answerProjectAsk(question, briefing, history);
  if (hasScriptedProjectAnswer(question, briefing, history)) {
    return { answer: formatAskAnswer(grounded) };
  }

  const modeled = await explainWithModel(
    resolved,
    projectAskPrompt(briefing, resolved),
    history,
  );
  const answer =
    modeled && !looksLikeAskDump(modeled) ? modeled : grounded;

  return { answer: formatAskAnswer(answer) };
}

function sanitizeHistory(history: AskMessage[] | undefined): AskMessage[] {
  return (history ?? [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-4)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 800),
    }))
    .filter((message) => message.content.length > 0);
}

async function explainWithModel(
  question: string,
  briefing: string,
  history: AskMessage[],
) {
  return completeChat({
    maxTokens: 700,
    timeoutMs: 30_000,
    messages: [
      {
        role: "system",
        content: briefing,
      },
      ...history,
      {
        role: "user",
        content: `Answer me in 2-4 short paragraphs. Do not paste labeled evidence lists or signal(strength) dumps. ${question}`,
      },
    ],
  });
}
