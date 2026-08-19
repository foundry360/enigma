import "server-only";

import {
  fallbackNarratives,
  type BusinessCaseBriefing,
} from "@/modules/economics/briefing";
import type { EvidenceSignal } from "@/modules/intelligence/evidence-expand";

export async function explainBusinessCase(briefing: BusinessCaseBriefing) {
  const fallback = fallbackNarratives(briefing);

  return {
    recommendationState: briefing.recommendationState,
    recommendationNarrative: fallback.recommendationNarrative,
    intelligenceNarrative: fallback.intelligenceNarrative,
  };
}

export async function expandCaseEvidence(_input: {
  name: string;
  citations: string[];
  signals: EvidenceSignal[];
}) {
  return null;
}
