import "server-only";

import { formatAskAnswer } from "@/modules/intelligence/ask-format";
import { buildIntelligenceBriefing } from "@/modules/intelligence/briefing";
import {
  buildOrgIntelligence,
  hydrateOrgIntelligence,
} from "@/modules/intelligence/org-intelligence";
import { opportunityDefinition } from "@/modules/intelligence/opportunities";
import { factsFromTraces } from "@/modules/intelligence/summarize";
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
  toDeploymentForecast,
} from "@/server/services/business-case";
import { getConnectionOrgProfile } from "@/server/services/connections";
import { completeChat } from "@/server/services/inference";
import { ensureOpportunityCandidates } from "@/server/services/opportunities";
import { getProject } from "@/server/services/projects";

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

  const [candidates, org, businessCase, project] = await Promise.all([
    ensureOpportunityCandidates(input.tenantId, detail.assessment.id),
    detail.assessment.connectionId
      ? getConnectionOrgProfile(
          input.tenantId,
          detail.assessment.connectionId,
        )
      : Promise.resolve(null),
    getBusinessCaseDetail(input.tenantId, input.projectId),
    getProject(input.tenantId, input.projectId),
  ]);

  const intelligence = buildIntelligenceBriefing({
    environment: org?.name ?? "Connected environment",
    status: detail.assessment.status,
    factCount: detail.traces.length,
    signals: detail.judgments.filter((item) => item.kind === "dimension"),
    candidates: candidates.map((candidate) => {
      const definition = opportunityDefinition(candidate.key, candidate.name);
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

  const facts = project
    ? factsFromTraces(
        {
          projectType: project.projectType,
          objective: project.objective,
          outcomes: project.outcomes,
        },
        detail.traces,
      )
    : null;
  const stored = detail.assessment.orgIntelligence;
  const rebuilt =
    facts && stored?.version !== 1
      ? buildOrgIntelligence(facts, {
          opportunityName: candidates[0]?.name ?? null,
        })
      : null;
  const orgIntelligence = stored?.version === 1
    ? hydrateOrgIntelligence(stored, facts)
    : rebuilt;

  const briefing = {
    intelligence,
    businessCase: businessCase ? buildCaseBriefing(businessCase) : null,
    orgIntelligence,
    forecast: businessCase
      ? toDeploymentForecast(businessCase, {
          org: orgIntelligence,
          environmentName: org?.name ?? orgIntelligence?.environment.orgName ?? null,
        })
      : null,
  };

  const history = sanitizeHistory(input.history);
  const resolved = resolveAskQuestion(question, history);
  if (hasScriptedProjectAnswer(question, briefing, history)) {
    return {
      answer: formatAskAnswer(answerProjectAsk(question, briefing, history)),
    };
  }

  const modeled = await explainWithModel(
    resolved,
    projectAskPrompt(briefing, resolved),
    history,
  );
  if (!modeled) {
    return { error: "Ask Enigma could not reach the model. Try again." };
  }

  return { answer: formatAskAnswer(modeled) };
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
      content: message.content.trim().slice(0, 1200),
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
        content: `The user asked: ${question}

Answer that question. Lead with the answer they asked for: definition, recommendation, risk, why, names, or next move. If they asked what a signal is or to explain it, define it first, then say what this run found. If they named a signal or opportunity, speak only to that. Use the labeled brief as evidence. Do not invent names, scores, volumes, or official Salesforce prices. Do not recap the whole brief or paste a roster unless they asked you to name or list things. 2-4 short conversational paragraphs.`,
      },
    ],
  });
}
