import "server-only";

import {
  briefingToPrompt,
  fallbackNarratives,
  type BusinessCaseBriefing,
} from "@/modules/economics/briefing";
import {
  acceptCaseStories,
  fallbackJustificationStory,
  fallbackRecommendationStory,
} from "@/modules/economics/story-slots";
import type { EvidenceSignal } from "@/modules/intelligence/evidence-expand";
import { completeChat } from "@/server/services/inference";

export async function explainBusinessCase(briefing: BusinessCaseBriefing) {
  const fallback = fallbackNarratives(briefing);
  const first = briefing.opportunities[0];
  const slotted = {
    justification: fallbackJustificationStory({
      complete: briefing.rollup.complete,
      process: first?.process ?? null,
      area: null,
      capability: first?.capability ?? null,
      valueDrivers: first?.valueDrivers ?? [],
      consumptionDrivers: first?.consumptionDrivers ?? [],
      constraints: first?.constraints ?? [],
    }),
    recommendation: fallbackRecommendationStory(briefing.rollup.complete),
  };
  const modeled = await completeChat({
    maxTokens: 1400,
    messages: [
      {
        role: "system",
        content: `You write Enigma business-case stories. Return only JSON with keys justification and recommendation. No markdown.

Use these tokens exactly when a number or recommendation label appears. Never write the number yourself:
{{volume}} {{share}} {{impacted}} {{hours}} {{labor}} {{value}} {{workItemCost}} {{consumption}} {{net}} {{roc}} {{state}}

Justification paints the picture only. No Proceed, Defer, or deploy recommendation. Conversational paragraphs. Follow the opportunity's name, process, and capability. Do not assume this is a service project.

Recommendation explains the given state. Do not change that state. Put {{state}} where the label belongs.

Do not invent volumes, hours, wages, or official Salesforce prices. If a figure is missing, say it is not set and use the token anyway.
Do not use em dashes or en dashes. Use commas or periods.`,
      },
      {
        role: "user",
        content: briefingToPrompt(briefing),
      },
    ],
  });
  const stories = acceptCaseStories(modeled, slotted);

  return {
    recommendationState: briefing.recommendationState,
    recommendationNarrative: stories.recommendationNarrative,
    justificationNarrative: stories.justificationNarrative,
    intelligenceNarrative: fallback.intelligenceNarrative,
    fromModel: stories.fromModel,
  };
}

export async function expandCaseEvidence(_input: {
  name: string;
  citations: string[];
  signals: EvidenceSignal[];
}) {
  return null;
}
