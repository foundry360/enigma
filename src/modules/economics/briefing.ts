import {
  recommendationLabel,
  type CaseRollup,
  type RecommendationState,
} from "@/modules/economics/model";

export type BusinessCaseBriefing = {
  opportunities: {
    name: string;
    process: string;
    capability: string;
    confidence: string;
    finding: string;
    signals: { title: string; strength: string }[];
    evidence: string[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies: string[];
  }[];
  assumptions: { label: string; value: string; source: string }[];
  rollup: CaseRollup;
  gaps: string[];
  recommendationState: RecommendationState;
};

export function toBusinessCaseBriefing(input: {
  opportunities: Array<{
    name: string;
    process: string;
    capability: string;
    confidence: string;
    finding: string;
    signals: { title: string; strength: string }[];
    evidence: string[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies: string[];
    annualVolume: number | null;
    unitPrice: number | null;
  }>;
  scenario: string;
  adoption: number | null;
  rollup: CaseRollup;
  gaps: string[];
  recommendationState: RecommendationState;
}): BusinessCaseBriefing {
  return {
    opportunities: input.opportunities.map((item) => ({
      name: item.name,
      process: item.process,
      capability: item.capability,
      confidence: item.confidence,
      finding: item.finding,
      signals: item.signals,
      evidence: item.evidence,
      consumptionDrivers: item.consumptionDrivers,
      valueDrivers: item.valueDrivers,
      constraints: item.constraints,
      dependencies: item.dependencies,
    })),
    assumptions: [
      {
        label: "Scenario",
        value: input.scenario,
        source: "Customer Provided",
      },
      {
        label: "Adoption",
        value: input.adoption == null ? "Insufficient data" : String(input.adoption),
        source:
          input.adoption == null ? "Needed" : "Customer Provided",
      },
      ...input.opportunities.flatMap((item) => [
        {
          label: `${item.name} annual volume`,
          value:
            item.annualVolume == null
              ? "Insufficient data"
              : String(item.annualVolume),
          source:
            item.annualVolume == null ? "Needed" : "Customer Provided",
        },
        {
          label: `${item.name} work item cost`,
          value:
            item.unitPrice == null ? "Not provided" : String(item.unitPrice),
          source:
            item.unitPrice == null ? "Optional" : "Customer Provided",
        },
      ]),
    ],
    rollup: input.rollup,
    gaps: input.gaps,
    recommendationState: input.recommendationState,
  };
}

export function briefingToPrompt(briefing: BusinessCaseBriefing) {
  const opportunities = briefing.opportunities
    .map((item) => {
      const signals = item.signals
        .map((signal) => `${signal.title} ${signal.strength}`)
        .join(", ");
      const evidence = item.evidence.join(" ");
      return `${item.name}: ${item.process} → ${item.capability}. Confidence ${item.confidence}. ${item.finding} Signals: ${signals || "none"}. Drivers: ${item.consumptionDrivers.join("; ")}. Value: ${item.valueDrivers.join("; ")}. Constraints: ${item.constraints.join("; ")}. Evidence: ${evidence || "none"}.`;
    })
    .join("\n");

  const assumptions = briefing.assumptions
    .map((item) => `${item.label}: ${item.value} (${item.source})`)
    .join(". ");

  const totals = briefing.rollup.complete
    ? `Consumption ${briefing.rollup.consumption}. Value ${briefing.rollup.value}. Net ${briefing.rollup.netAnnual}. ROI ${briefing.rollup.roi}. Payback months ${briefing.rollup.paybackMonths}. ROC ${briefing.rollup.roc}. Potential accelerated value ${briefing.rollup.roa}.`
    : "Totals are insufficient. Do not invent numbers.";

  const gaps = briefing.gaps.length
    ? `Gaps: ${briefing.gaps.join(" ")}`
    : "No listed gaps.";

  return [
    "This briefing is the only source of truth for a project Business Case.",
    opportunities || "No promoted opportunities.",
    assumptions || "No assumptions recorded.",
    totals,
    gaps,
    `Fallback recommendation state: ${recommendationLabel[briefing.recommendationState]}.`,
  ].join("\n");
}

export function fallbackNarratives(briefing: BusinessCaseBriefing) {
  const names = briefing.opportunities.map((item) => item.name).join(", ");
  const recommendation = briefing.rollup.complete
    ? `${recommendationLabel[briefing.recommendationState]}. The calculated model uses inherited intelligence from ${names || "the promoted opportunities"} and the customer assumptions that are present. Missing inputs stay blank.`
    : "Do Not Proceed until work per year, time on one today, and hourly labor cost are present on at least one opportunity. Enigma will not invent those numbers.";

  const intelligence = briefing.opportunities
    .map((item) => {
      const evidence = item.evidence[0]
        ? ` Evidence: ${item.evidence[0]}`
        : "";
      return `${item.name} is supported by ${item.signals.map((signal) => signal.title).join(", ") || "no named signals"}.${evidence}`;
    })
    .join(" ");

  return {
    recommendationNarrative: recommendation,
    intelligenceNarrative:
      intelligence ||
      "Promote an opportunity before Enigma can explain inherited intelligence.",
  };
}
