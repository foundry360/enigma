import "server-only";

import {
  briefingToPrompt,
  fallbackNarratives,
  type BusinessCaseBriefing,
} from "@/modules/economics/briefing";
import {
  acceptCaseStories,
  alignStoriesToRoster,
  fallbackJustificationStory,
  fallbackRecommendationStory,
  formatStoryText,
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
      opportunities: briefing.opportunities.map((item) => ({
        name: item.name,
        process: item.process,
        capability: item.capability,
        confidence: item.confidence,
        finding: item.finding,
        signals: item.signals,
      })),
      valueDrivers: briefing.opportunities.flatMap(
        (item) => item.valueDrivers ?? [],
      ),
      consumptionDrivers: briefing.opportunities.flatMap(
        (item) => item.consumptionDrivers ?? [],
      ),
      constraints: briefing.opportunities.flatMap(
        (item) => item.constraints ?? [],
      ),
    }),
    recommendation: fallbackRecommendationStory({
      complete: briefing.rollup.complete,
      opportunityNames,
      opportunities: briefing.opportunities,
      constraints: briefing.opportunities.flatMap(
        (item) => item.constraints ?? [],
      ),
      recommendationState: briefing.recommendationState,
      recommendationWhy: briefing.recommendationWhy,
    }),
  };
  slotted.justification = alignStoriesToRoster(
    slotted.justification,
    opportunityNames,
  );
  slotted.recommendation = alignStoriesToRoster(
    slotted.recommendation,
    opportunityNames,
  );

  const prompt = briefingToPrompt(briefing);
  let modeled = await writeCaseStories(prompt, opportunityNames);
  if (
    modeled &&
    !storiesCoverOpportunities(
      `${modeled.justificationNarrative}\n${modeled.recommendationNarrative}`,
      opportunityNames,
    )
  ) {
    modeled =
      (await writeCaseStories(
        [
          prompt,
          "The last draft was too fragmented, too short, or missed a promoted opportunity. Rewrite both stories as finished narrative paragraphs. Name every promoted opportunity. Do not use a list.",
        ].join("\n\n"),
        opportunityNames,
      )) ?? modeled;
  }

  const stories = polishStories(modeled, slotted, opportunityNames);

  return {
    recommendationState: briefing.recommendationState,
    recommendationNarrative: stories.recommendationNarrative,
    justificationNarrative: stories.justificationNarrative,
    intelligenceNarrative: fallback.intelligenceNarrative,
    fromModel: stories.fromModel,
  };
}

async function writeCaseStories(
  briefing: string,
  opportunityNames: string[],
) {
  const modeled = await completeChat({
    maxTokens: 4000,
    timeoutMs: 60_000,
    messages: [
      {
        role: "system",
        content: storyWriterPrompt(opportunityNames),
      },
      {
        role: "user",
        content: briefing,
      },
    ],
  });
  if (!modeled) {
    return null;
  }

  return acceptCaseStories(modeled, {
    justification: "",
    recommendation: "",
  });
}

function polishStories(
  modeled: {
    justificationNarrative: string;
    recommendationNarrative: string;
    fromModel: boolean;
  } | null,
  slotted: { justification: string; recommendation: string },
  opportunityNames: string[],
) {
  const justification = modeled?.justificationNarrative
    ? alignStoriesToRoster(
        formatStoryText(modeled.justificationNarrative),
        opportunityNames,
      )
    : "";
  const recommendation = modeled?.recommendationNarrative
    ? alignStoriesToRoster(
        formatStoryText(modeled.recommendationNarrative),
        opportunityNames,
      )
    : "";
  return {
    justificationNarrative: justification || slotted.justification,
    recommendationNarrative: recommendation || slotted.recommendation,
    fromModel: Boolean(justification || recommendation),
  };
}

function storyWriterPrompt(names: string[]) {
  const roster =
    names.filter((name) => name.trim()).join(", ") ||
    "the opportunity on this case";

  return `You write Enigma business-case narratives for executives. Return only JSON with keys justification and recommendation.

Both values are finished prose, not notes. Separate paragraphs with a blank line. Every paragraph contains 3 to 5 complete sentences. Never leave one sentence as its own paragraph. Never write bullet lists, numbered lists, markdown, headings, or sentence fragments.

Use ordinary American business English. Capitalize the first word of every sentence. End every sentence with a period. Use commas inside sentences where grammar requires them. Do not use em dashes or en dashes.

Live figures appear only as these tokens. Never write the number yourself:
{{volume}} {{share}} {{impacted}} {{hours}} {{labor}} {{value}} {{workItemCost}} {{consumption}} {{net}} {{roc}} {{state}}

justification is the economic and operational story. Open with the annual work and cost using the tokens. Then tell a continuous story of the promoted opportunities, naming each one and giving it its own process and finding. State the shared signal picture once, in prose, not as a recap list. Close with value, consumption, and constraints. Do not recommend Proceed, Defer, or deploy. Do not cite tools, objects, evidence, or sources in brackets or parentheses.

recommendation explains the given state. Do not change that state. The page already prints the state label, so do not open with "The recommendation is {{state}}." Open with {{roc}} and {{net}}. Name every promoted opportunity in the same narrative. State the weak-signal holds once, with what to confirm next. Do not repeat the volume, hours, and labor arithmetic.

Promoted opportunities, and the only agents you may name: ${roster}.
Use each signal's exact strength from the briefing. Do not invent volumes, hours, wages, or official Salesforce prices. If a figure is missing, say it is not set and still use the token.`;
}

export async function expandCaseEvidence(_input: {
  name: string;
  citations: string[];
  signals: EvidenceSignal[];
}) {
  return null;
}
