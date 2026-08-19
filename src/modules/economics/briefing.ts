import { formatCurrency, formatCurrencyPrecise, formatMonths, formatMultiple } from "@/lib/format";
import {
  peelLayerPrefix,
  summarizeEvidenceLayers,
} from "@/modules/intelligence/evidence-expand";
import {
  explainRecommendation,
  recommendationLabel,
  type CaseRollup,
  type RecommendationState,
} from "@/modules/economics/model";
import {
  describeWeakSignal,
  signalAdvice,
} from "@/modules/intelligence/signal-advice";

export type BusinessCaseBriefing = {
  opportunities: {
    name: string;
    process: string;
    capability: string;
    confidence: string;
    finding: string;
    signals: { key?: string; title: string; strength: string }[];
    evidence: string[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies: string[];
    annualVolume: number | null;
    unitPrice: number | null;
    hoursSavedPerUnit: number | null;
    hourlyCost: number | null;
  }[];
  assumptions: { label: string; value: string; source: string }[];
  calculations: string[];
  rollup: CaseRollup;
  gaps: string[];
  recommendationState: RecommendationState;
  recommendationWhy: string;
};

export function toBusinessCaseBriefing(input: {
  opportunities: Array<{
    name: string;
    process: string;
    capability: string;
    confidence: string;
    finding: string;
    signals: { key?: string; title: string; strength: string }[];
    evidence: string[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies: string[];
    annualVolume: number | null;
    unitPrice: number | null;
    hoursSavedPerUnit?: number | null;
    hourlyCost?: number | null;
  }>;
  scenario: string;
  adoption: number | null;
  baselineDays?: number | null;
  enigmaDays?: number | null;
  implementation?: number | null;
  rollup: CaseRollup;
  gaps: string[];
  recommendationState: RecommendationState;
  hasWeakSignals?: boolean;
  weakSignals?: string[];
  confidence?: "high" | "medium" | "low" | null;
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
      annualVolume: item.annualVolume,
      unitPrice: item.unitPrice,
      hoursSavedPerUnit: item.hoursSavedPerUnit ?? null,
      hourlyCost: item.hourlyCost ?? null,
    })),
    assumptions: [
      {
        label: "Scenario",
        value: input.scenario,
        source: "Customer Provided",
      },
      {
        label: "Share",
        value: input.adoption == null ? "Insufficient data" : String(input.adoption),
        source: input.adoption == null ? "Needed" : "Customer Provided",
      },
      {
        label: "Days without Enigma",
        value:
          input.baselineDays == null
            ? "Insufficient data"
            : String(input.baselineDays),
        source: input.baselineDays == null ? "Needed" : "Customer Provided",
      },
      {
        label: "Days with Enigma",
        value:
          input.enigmaDays == null ? "Insufficient data" : String(input.enigmaDays),
        source: input.enigmaDays == null ? "Needed" : "Customer Provided",
      },
      {
        label: "Investment",
        value:
          input.implementation == null
            ? "Insufficient data"
            : String(input.implementation),
        source: input.implementation == null ? "Needed" : "Customer Provided",
      },
      ...input.opportunities.flatMap((item) => [
        {
          label: `${item.name} work per year`,
          value:
            item.annualVolume == null
              ? "Insufficient data"
              : String(item.annualVolume),
          source: item.annualVolume == null ? "Needed" : "Customer Provided",
        },
        {
          label: `${item.name} work item cost`,
          value:
            item.unitPrice == null ? "Not provided" : String(item.unitPrice),
          source: item.unitPrice == null ? "Optional" : "Customer Provided",
        },
        {
          label: `${item.name} hours on work item`,
          value:
            item.hoursSavedPerUnit == null
              ? "Insufficient data"
              : String(item.hoursSavedPerUnit),
          source: item.hoursSavedPerUnit == null ? "Needed" : "Customer Provided",
        },
        {
          label: `${item.name} labor cost per hour`,
          value:
            item.hourlyCost == null
              ? "Insufficient data"
              : String(item.hourlyCost),
          source: item.hourlyCost == null ? "Needed" : "Customer Provided",
        },
      ]),
    ],
    calculations: explainCaseCalculations({
      opportunities: input.opportunities,
      adoption: input.adoption,
      rollup: input.rollup,
    }),
    rollup: input.rollup,
    gaps: input.gaps,
    recommendationState: input.recommendationState,
    recommendationWhy: explainRecommendation({
      state: input.recommendationState,
      rollup: input.rollup,
      gaps: input.gaps,
      hasWeakSignals: input.hasWeakSignals ?? false,
      weakSignals:
        input.weakSignals ??
        input.opportunities.flatMap((item) =>
          item.signals
            .filter((signal) => signal.strength === "weak")
            .map((signal) => signal.title),
        ),
      confidence: input.confidence ?? null,
    }),
  };
}

export function explainCaseCalculations(input: {
  opportunities: Array<{
    name: string;
    annualVolume: number | null;
    unitPrice: number | null;
    hoursSavedPerUnit?: number | null;
    hourlyCost?: number | null;
  }>;
  adoption: number | null;
  rollup: CaseRollup;
}) {
  const lines = input.opportunities.map((item) => {
    if (
      item.annualVolume == null ||
      input.adoption == null ||
      item.hoursSavedPerUnit == null ||
      item.hourlyCost == null
    ) {
      return `${item.name}: insufficient data. Need work per year, share, hours on one today, and labor cost.`;
    }

    const impacted = item.annualVolume * input.adoption;
    const consumption =
      item.unitPrice == null ? null : impacted * item.unitPrice;
    const value = impacted * item.hoursSavedPerUnit * item.hourlyCost;
    return [
      `On ${item.name}, Impacted is ${impacted}, from ${item.annualVolume} work per year at a ${input.adoption} share.`,
      consumption == null
        ? `Consumption is blank because work item cost is not provided.`
        : `Consumption is ${formatCurrency(consumption)}, from that impacted work times a ${formatCurrencyPrecise(item.unitPrice)} work item cost.`,
      `Value is ${formatCurrency(value)}, from the same impacted work times ${item.hoursSavedPerUnit} hours given back at ${formatCurrency(item.hourlyCost)} an hour.`,
    ].join(" ");
  });

  if (!input.rollup.complete) {
    return [...lines, "Case totals are blank until at least one line is complete."];
  }

  return [
    ...lines,
    [
      `Rolled up, Impacted is ${input.rollup.impacted}.`,
      `Consumption is ${input.rollup.consumption == null ? "blank" : formatCurrency(input.rollup.consumption)}.`,
      `Value is ${formatCurrency(input.rollup.value)}.`,
      `Annual net is ${formatCurrency(input.rollup.netAnnual)}.`,
      `ROC is ${input.rollup.roc ?? "blank"}.`,
      `ROI is ${input.rollup.roi == null ? "blank" : formatMultiple(input.rollup.roi)}.`,
      `Payback is ${input.rollup.paybackMonths == null ? "blank" : formatMonths(input.rollup.paybackMonths)}.`,
      `Accelerated value is ${input.rollup.roa == null ? "blank" : formatCurrency(input.rollup.roa)}.`,
    ].join(" "),
  ];
}

export function briefingToPrompt(briefing: BusinessCaseBriefing) {
  const opportunities = briefing.opportunities
    .map((item) => {
      const signals = item.signals
        .map((signal) => `${signal.title} ${signal.strength}`)
        .join(", ");
      const evidence = summarizeEvidenceLayers({ citations: item.evidence })
        .map((layer) => layer.paragraph)
        .join(" ");
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
  const calculations = (briefing.calculations ?? []).join(" ");

  return [
    "This briefing is the only source of truth for a project Business Case.",
    opportunities || "No promoted opportunities.",
    assumptions || "No assumptions recorded.",
    calculations || "No calculated lines yet.",
    totals,
    gaps,
    `Fallback recommendation state: ${recommendationLabel[briefing.recommendationState]}.`,
    briefing.recommendationWhy ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function compactCasePrompt(briefing: BusinessCaseBriefing) {
  const opportunities = briefing.opportunities
    .map((item) => {
      const signals = item.signals
        .map((signal) => `${signal.title} ${signal.strength}`)
        .join(", ");
      const evidence = summarizeEvidenceLayers({ citations: item.evidence })
        .map((layer) => `${layer.label}: ${layer.paragraph}`)
        .join(" ");
      return `${item.name}: ${item.finding} Signals: ${signals || "none"}. Evidence: ${evidence || "none"}. Constraints: ${item.constraints.join("; ") || "none"}.`;
    })
    .join("\n");

  return [
    `Recommendation state: ${recommendationLabel[briefing.recommendationState]}.`,
    briefing.recommendationWhy,
    briefing.calculations.join("\n") || "No calculated lines yet.",
    briefing.gaps.length ? `Gaps: ${briefing.gaps.join(" ")}` : "No listed input gaps.",
    opportunities || "No promoted opportunities.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function parseNarratives(content: string | null) {
  if (!content) {
    return null;
  }

  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        recommendation?: string;
        intelligence?: string;
      };
      if (parsed.recommendation && parsed.intelligence) {
        return {
          recommendation: parsed.recommendation.trim(),
          intelligence: parsed.intelligence.trim(),
        };
      }
    } catch {
      // Fall through to labeled prose.
    }
  }

  const labeled = trimmed.match(
    /recommendation:\s*([\s\S]+?)(?:\n+\s*intelligence:|$)/i,
  );
  const intelligence = trimmed.match(/intelligence:\s*([\s\S]+)$/i);
  if (labeled?.[1] && intelligence?.[1]) {
    return {
      recommendation: labeled[1].replace(/^recommendation:\s*/i, "").trim(),
      intelligence: intelligence[1].trim(),
    };
  }

  return null;
}

export function decipherRecommendation(briefing: BusinessCaseBriefing) {
  if (!briefing.rollup.complete) {
    return "Do not proceed until work per year, hours on one today, and labor cost are present on at least one opportunity. Enigma will not invent those numbers.";
  }

  const weak = uniqueSignals(
    briefing.opportunities.flatMap((item) =>
      item.signals.filter((signal) => signal.strength === "weak"),
    ),
  );
  const weakNames = weak.map((signal) => signalAdvice(signal).title);
  const evidence = briefing.opportunities.flatMap((item) => item.evidence);
  const constraints = [
    ...new Set(briefing.opportunities.flatMap((item) => item.constraints)),
  ];

  const opening = recommendationOpening(briefing);
  const opportunities = briefing.opportunities.map((item) => {
    const strong = item.signals
      .filter((signal) => signal.strength === "strong")
      .map((signal) => signal.title);
    const strength = strong.length
      ? ` ${joinAnd(strong)} ${strong.length === 1 ? "is" : "are"} strong.`
      : "";
    return withSource(
      `${item.name} is a ${item.confidence}-confidence opportunity. ${ensureSentence(item.finding)}${strength}`,
      item.evidence[0],
    );
  });
  const holds = weak.map((signal) =>
    withSource(
      describeWeakSignal({
        key: signal.key,
        title: signal.title,
        strength: signal.strength,
      }),
      sourceForSignal(evidence, signal),
    ),
  );
  const watch = constraints.length
    ? `Keep these constraints in view as you stand up the work: ${ensureList(constraints)}`
    : "";
  const next =
    weak.length > 0
      ? `Confirm the case, but do not treat go-live as unconstrained until ${joinAnd(weakNames)} ${weakNames.length === 1 ? "strengthens" : "strengthen"}. Close those readiness holds, and the recommendation can move to Proceed.`
      : ensureSentence(briefing.recommendationWhy);

  return [opening, ...opportunities, ...holds, watch, next]
    .filter(Boolean)
    .map((paragraph) => ensureSentence(paragraph))
    .join("\n\n");
}

function recommendationOpening(briefing: BusinessCaseBriefing) {
  const parts: string[] = [];
  if (briefing.rollup.roc != null) {
    parts.push(`ROC is ${briefing.rollup.roc}`);
  }
  if (briefing.rollup.netAnnual != null) {
    parts.push(`annual net is ${formatCurrency(briefing.rollup.netAnnual)}`);
  }
  if (briefing.gaps.length === 0) {
    parts.push("the customer inputs are complete enough to calculate");
  }

  const math = parts.length ? ` ${joinAnd(parts)}.` : "";
  const gaps = briefing.gaps.length
    ? ` ${ensureSentence(`Still open: ${ensureList(briefing.gaps)}`)}`
    : "";

  if (briefing.recommendationState === "proceed_with_conditions") {
    return `The numbers support moving forward.${math} The hold is readiness, not the arithmetic.${gaps}`;
  }

  if (briefing.recommendationState === "proceed") {
    return `The case is ready to proceed.${math}${gaps}`;
  }

  return `${recommendationLabel[briefing.recommendationState]}.${math}${gaps}`;
}

export const SOURCE_CITE = /⟦([^⟦⟧]+)⟧/g;

export function splitCitedCopy(text: string) {
  const parts: Array<{ text: string; cited: boolean }> = [];
  const pattern = new RegExp(SOURCE_CITE.source, "g");
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) {
      parts.push({ text: text.slice(last, start), cited: false });
    }
    parts.push({ text: match[1], cited: true });
    last = start + match[0].length;
  }

  if (last < text.length) {
    parts.push({ text: text.slice(last), cited: false });
  }

  return parts;
}

export function markSource(citation: string) {
  const label = shortSource(citation);
  return label ? `⟦${label}⟧` : "";
}

function withSource(sentence: string, citation?: string | null) {
  const body = ensureSentence(sentence).replace(/[.!?]$/, "");
  const source = citation ? markSource(citation) : "";
  return source ? `${body} ${source}.` : ensureSentence(body);
}

function sourceForSignal(
  citations: string[],
  signal: { key?: string; title: string },
) {
  const titles = [signal.title, signalAdvice(signal).title].map((title) =>
    title.toLowerCase(),
  );
  return (
    citations.find((citation) => {
      const peeled = peelLayerPrefix(citation);
      return titles.some(
        (title) =>
          citation.toLowerCase().startsWith(`${title}:`) ||
          peeled.label.toLowerCase() === title,
      );
    }) ?? null
  );
}

function shortSource(citation: string) {
  const fact = peelLayerPrefix(citation).fact.replace(/\.$/, "").trim();
  if (fact.length <= 72) {
    return fact;
  }

  return `${fact.slice(0, 69)}…`;
}

function uniqueSignals(
  signals: Array<{ key?: string; title: string; strength: string }>,
) {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const id = `${signal.key ?? ""}:${signal.title}`;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function joinAnd(values: string[]) {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function ensureList(values: string[]) {
  return joinAnd(values.map((value) => value.replace(/\.$/, "")));
}

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
}

export function fallbackNarratives(briefing: BusinessCaseBriefing) {
  const recommendation = briefing.rollup.complete
    ? decipherRecommendation(briefing)
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
