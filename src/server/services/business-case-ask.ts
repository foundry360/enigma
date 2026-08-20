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
  storiesCoverOpportunities,
} from "@/modules/economics/story-slots";
import type { EvidenceSignal } from "@/modules/intelligence/evidence-expand";
import { completeChat } from "@/server/services/inference";

export async function explainBusinessCase(briefing: BusinessCaseBriefing) {
  const fallback = fallbackNarratives(briefing);
  const first = briefing.opportunities[0];
  const opportunityNames = briefing.opportunities.map((item) => item.name);
  const slotted = {
    justification: fallbackJustificationStory({
      complete: briefing.rollup.complete,
      process: first?.process ?? null,
      area: null,
      capability: first?.capability ?? null,
      opportunityNames,
      valueDrivers: first?.valueDrivers ?? [],
      consumptionDrivers: first?.consumptionDrivers ?? [],
      constraints: first?.constraints ?? [],
    }),
    recommendation: fallbackRecommendationStory(
      briefing.rollup.complete,
      opportunityNames,
    ),
  };
  const modeled = await completeChat({
    maxTokens: 1400,
    messages: [
      {
        role: "system",
        content: `You write Enigma business-case stories. Return only JSON with keys justification and recommendation. No markdown. No bullet lists.

Use these tokens exactly when a number or recommendation label appears. Never write the number yourself:
{{volume}} {{share}} {{impacted}} {{hours}} {{labor}} {{value}} {{workItemCost}} {{consumption}} {{net}} {{roc}} {{state}}

Each story is 2 to 4 short paragraphs. Separate paragraphs with a blank line. Each paragraph is 2 to 4 complete sentences. Capitalize the first word of every sentence. End every sentence with a period. Do not write a single run-on block.

Justification paints the picture only. No Proceed, Defer, or deploy recommendation. Name every promoted opportunity from the briefing, not only the first. Follow each opportunity's name, process, and capability. Case totals in the tokens are rolled up across those opportunities. Do not assume this is a service project.

Recommendation explains the given state. Do not change that state. Put {{state}} where the label belongs. Name every promoted opportunity. Put the recommendation label in its own first paragraph, then the numbers, then what the case covers.

Use each signal's exact strength from the briefing. Do not call a mixed or weak signal strong. If Operating path is mixed, say mixed.

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
  const named = storiesCoverOpportunities(
    `${stories.justificationNarrative}\n${stories.recommendationNarrative}`,
    opportunityNames,
  )
    ? stories
    : {
        justificationNarrative: slotted.justification,
        recommendationNarrative: slotted.recommendation,
        fromModel: false,
      };

  return {
    recommendationState: briefing.recommendationState,
    recommendationNarrative: named.recommendationNarrative,
    justificationNarrative: named.justificationNarrative,
    intelligenceNarrative: fallback.intelligenceNarrative,
    fromModel: named.fromModel,
  };
}

export async function expandCaseEvidence(_input: {
  name: string;
  citations: string[];
  signals: EvidenceSignal[];
}) {
  return null;
}
