import { opportunityCatalog } from "@/modules/intelligence/opportunities";
import {
  summarizeImplication,
  summarizeSupportingSignals,
} from "@/modules/intelligence/opportunity-summaries";
import { signalState } from "@/modules/intelligence/score";
import { resolveSignalKey, signalAdvice } from "@/modules/intelligence/signal-advice";
import { splitSignalCopy } from "@/modules/intelligence/signals";
import type { SignalKey } from "@/modules/intelligence/types";

export type IntelligenceBriefing = {
  environment: string;
  status: string;
  factCount: number;
  signals: {
    key?: string;
    title: string;
    strength: "strong" | "mixed" | "weak";
    score: number;
    meaning: string;
    consumption: string;
    risk: string;
    recommendation: string;
    evidence: string[];
  }[];
  candidates: {
    name: string;
    description: string;
    finding: string;
    confidence: string;
    status: string;
    supporting: string[];
    evidence: string[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies: string[];
    risk: string;
    recommendation: string;
  }[];
};

const officialPriceAsk =
  /official (price|pricing)|list price|salesforce (price|pricing|license)|license price|what does salesforce charge/i;

export function isOfficialPriceAsk(question: string) {
  return officialPriceAsk.test(question);
}

/** @deprecated Use isOfficialPriceAsk. Kept for existing imports. */
export function isPriceAsk(question: string) {
  return isOfficialPriceAsk(question);
}

export function buildIntelligenceBriefing(input: {
  environment: string;
  status: string;
  factCount: number;
  signals: {
    key?: string;
    title: string;
    score: number;
    reason: string;
    risk: string;
    recommendation: string;
    evidence: { citation: string }[];
  }[];
  candidates: {
    name: string;
    description: string;
    finding: string;
    confidence: string;
    status: string;
    supportingSignals: { title: string; strength: string }[];
    evidence?: { citation: string }[];
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
    dependencies?: string[];
    risk?: string;
    recommendation?: string;
  }[];
}): IntelligenceBriefing {
  return {
    environment: input.environment,
    status: input.status,
    factCount: input.factCount,
    signals: input.signals.map((signal) => {
      const copy = splitSignalCopy(signal.reason);
      return {
        key: signal.key,
        title: signal.title,
        strength: signalState(signal.score),
        score: signal.score,
        meaning: copy.meaning,
        consumption: copy.consumption,
        risk: signal.risk,
        recommendation: signal.recommendation,
        evidence: signal.evidence.map((entry) => entry.citation),
      };
    }),
    candidates: input.candidates.map((candidate) => ({
      name: candidate.name,
      description: candidate.description,
      finding: candidate.finding,
      confidence: candidate.confidence,
      status: candidate.status,
      supporting: candidate.supportingSignals.map(
        (signal) => `${signal.title} (${signal.strength})`,
      ),
      evidence: (candidate.evidence ?? []).map((entry) => entry.citation),
      consumptionDrivers: candidate.consumptionDrivers,
      valueDrivers: candidate.valueDrivers,
      constraints: candidate.constraints,
      dependencies: candidate.dependencies ?? [],
      risk: candidate.risk ?? "",
      recommendation: candidate.recommendation ?? "",
    })),
  };
}

export function briefingToPrompt(briefing: IntelligenceBriefing) {
  const signals = briefing.signals
    .map((signal) => {
      const evidence = signal.evidence.length
        ? ` Evidence: ${signal.evidence.join(" ")}`
        : "";
      return `${signal.title} is ${signal.strength}. ${signal.meaning} ${signal.consumption} Risk: ${signal.risk} Recommendation: ${signal.recommendation}.${evidence}`;
    })
    .join("\n");
  const candidates = briefing.candidates
    .map((candidate) => {
      const evidence = candidate.evidence.length
        ? ` Evidence: ${candidate.evidence.join(" ")}`
        : "";
      return `${candidate.name} (${candidate.confidence} confidence, ${candidate.status}): ${candidate.description} ${candidate.finding} Supported by ${candidate.supporting.join(", ") || "no supporting signals"}.${evidence} Potential consumption drivers: ${candidate.consumptionDrivers.join(", ")}. Potential value drivers: ${candidate.valueDrivers.join(", ")}. Constraints: ${candidate.constraints.join(", ")}. Must be in place: ${candidate.dependencies.join(", ") || "none listed"}. Risk: ${candidate.risk || "none listed"}. Next move: ${candidate.recommendation || "Review this candidate"}.`;
    })
    .join("\n");

  return [
    `Environment: ${briefing.environment}. Status: ${briefing.status}. Facts: ${briefing.factCount}.`,
    signals || "No business signals were produced.",
    candidates || "No opportunity candidates were produced.",
  ].join("\n\n");
}

export function suggestedAsks(briefing: IntelligenceBriefing) {
  const strongest = [...briefing.signals].sort((a, b) => b.score - a.score)[0];
  const weakest = [...briefing.signals].sort((a, b) => a.score - b.score)[0];
  const candidate = briefing.candidates[0];
  const asks: string[] = [];

  if (strongest) {
    asks.push(`Why is ${strongest.title} ${strongest.strength}?`);
  }

  if (briefing.candidates.length === 1) {
    asks.push("Why am I only seeing one opportunity?");
  } else if (briefing.candidates.length === 0) {
    asks.push("Why were no opportunities emitted?");
  } else {
    asks.push("Which opportunities did this run produce?");
  }

  if (candidate) {
    asks.push(`Why is ${candidate.name} a candidate, and what evidence supports it?`);
  } else if (weakest) {
    asks.push(`What would strengthen ${weakest.title}?`);
  }

  return asks.slice(0, 3);
}

export function answerFromBriefing(
  question: string,
  briefing: IntelligenceBriefing,
) {
  const trimmed = question.trim();
  if (!trimmed) {
    return "Ask about a signal, a candidate, or what Enigma found in this run.";
  }

  if (isOfficialPriceAsk(trimmed)) {
    return "This project does not contain official Salesforce prices or licenses. Use the customer's work item cost on the Business Case. I can explain how Consumption, Value, ROC, and ROI are calculated from those inputs.";
  }

  if (briefing.signals.length === 0) {
    return "This intelligence run has no business signals yet. Run intelligence against a connected environment first.";
  }

  const matchedSignals = briefing.signals.filter((signal) =>
    matchesPhrase(trimmed, signal.title),
  );
  const matchedCandidates = briefing.candidates.filter((candidate) =>
    matchesPhrase(trimmed, candidate.name),
  );
  const wantsEvidence = /evidence|cited|what supports/i.test(trimmed);

  if (isOpportunityCountAsk(trimmed)) {
    return explainOpportunityCount(briefing);
  }

  if (/watch|before promot|constraint/i.test(trimmed)) {
    const candidate = matchedCandidates[0] ?? briefing.candidates[0];
    if (candidate) {
      return [
        `${candidate.name} is supported, but it is not unconstrained.`,
        summarizeImplication("Constraints", candidate.constraints),
        "Consumption and value drivers stay hypotheses until the Business Case has customer rates.",
      ].join("\n\n");
    }
  }

  if (matchedSignals.length > 0) {
    return matchedSignals.map((signal) => formatSignalAnswer(signal)).join("\n\n");
  }

  if (matchedCandidates.length > 0) {
    return matchedCandidates
      .map((candidate) => formatCandidateAnswer(candidate, { evidence: wantsEvidence }))
      .join("\n\n");
  }

  if (/candidate|opportunit|promote|hypothesis/i.test(trimmed)) {
    if (briefing.candidates.length === 0) {
      return explainOpportunityCount(briefing);
    }

    return briefing.candidates
      .map((candidate) => formatCandidateAnswer(candidate, { evidence: wantsEvidence }))
      .join("\n\n");
  }

  if (/signal|strength|find|what did|what can|environment/i.test(trimmed)) {
    return [
      `From ${briefing.environment}, Enigma scored the business signals on this run.`,
      briefing.signals
        .map((signal) => `${signal.title} is ${signal.strength}`)
        .join(". ") + ".",
      "Ask about a named signal or opportunity if you want the evidence behind one of those.",
    ].join("\n\n");
  }

  return "I can only explain this intelligence run. Ask about a business signal, an opportunity, supporting evidence, or why an opportunity did or did not appear. I will not invent scores, volumes, or prices.";
}

export function formatSignalAnswer(
  signal: IntelligenceBriefing["signals"][number],
) {
  const cite = signal.evidence[0]
    ? ` The run cited ${signal.evidence[0].replace(/\.$/, "")}.`
    : "";
  return [
    `${signal.title} is ${signal.strength}. ${asSentence(signal.meaning)} ${asSentence(signal.consumption)}`.trim(),
    `${asSentence(`The risk is ${lowerStart(signal.risk)}`)} ${asSentence(signal.recommendation)}${cite}`.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function formatCandidateAnswer(
  candidate: IntelligenceBriefing["candidates"][number],
  options?: { evidence?: boolean },
) {
  const intro = [
    `${candidate.name} is on this run as a ${candidate.confidence}-confidence opportunity.`,
    asSentence(candidate.description),
    asSentence(candidate.finding),
  ].join(" ");
  const support = summarizeSupportingSignals(supportingRefs(candidate.supporting));
  const close = [
    summarizeImplication("Constraints", candidate.constraints),
    summarizeImplication("Dependencies", candidate.dependencies),
    candidate.risk ? asSentence(`The risk is ${lowerStart(candidate.risk)}`) : "",
    asSentence(candidate.recommendation),
  ]
    .filter(Boolean)
    .join(" ");
  const evidence =
    options?.evidence && candidate.evidence.length > 0
      ? `The run cited ${joinAnd(
          candidate.evidence.slice(0, 3).map((item) => item.replace(/\.$/, "")),
        )}.`
      : "";

  return [intro, support, close, evidence].filter(Boolean).join("\n\n");
}

export function isOpportunityCountAsk(question: string) {
  return /only (one|a single)|why (am i|are we|is there) only|seeing (only )?(one|a single)|how many (candidates|opportunit)|missing (candidate|opportunit)|didn't (see|emit)|were no (candidates|opportunities)|no (candidates|opportunities) (were|was)/i.test(
    question,
  );
}

function explainOpportunityCount(briefing: IntelligenceBriefing) {
  const names = briefing.candidates.map((item) => item.name);
  const emitted = new Set(names.map((name) => name.toLowerCase()));
  const blocked = opportunityCatalog.flatMap((definition) => {
    if (emitted.has(definition.title.toLowerCase())) {
      return [];
    }

    const weakRequired = definition.requiredSignals
      .map((key) => lookupSignal(briefing.signals, key))
      .filter(
        (signal): signal is IntelligenceBriefing["signals"][number] =>
          signal?.strength === "weak",
      );
    if (weakRequired.length > 0) {
      const titles = weakRequired.map((signal) => signal.title);
      return [
        `${definition.title} did not appear because ${joinAnd(titles)} ${
          titles.length === 1 ? "is" : "are"
        } still weak.`,
      ];
    }

    const missing = definition.requiredSignals.filter(
      (key) => !lookupSignal(briefing.signals, key),
    );
    if (missing.length > 0) {
      const titles = missing.map(requiredSignalTitle);
      return [
        `${definition.title} did not appear because ${joinAnd(titles)} ${
          titles.length === 1 ? "was" : "were"
        } not mixed or strong on this run.`,
      ];
    }

    return [
      `${definition.title} did not meet the required signal combination.`,
    ];
  });

  const qualified = briefing.candidates.map((candidate) => {
    const definition = opportunityCatalog.find(
      (item) => item.title.toLowerCase() === candidate.name.toLowerCase(),
    );
    if (!definition) {
      return `${candidate.name} is on this run because its required signals were mixed or strong.`;
    }

    const required = definition.requiredSignals.map(requiredSignalTitle);
    return `${candidate.name} is on this run because ${joinAnd(required)} ${
      required.length === 1 ? "is" : "are"
    } mixed or strong.`;
  });

  if (briefing.candidates.length === 0) {
    return [
      "No opportunities were emitted. An opportunity appears only when every required signal for that hypothesis is mixed or strong.",
      ...blocked,
      "That is a signal combination, not a list of every object Enigma found.",
    ].join("\n\n");
  }

  if (briefing.candidates.length === 1) {
    return [
      `You are only seeing ${names[0]} because it is the only hypothesis whose required signals were mixed or strong.`,
      qualified[0],
      ...blocked,
      "Watch signals that are still weak do not hide this opportunity, but they do keep the write path constrained.",
    ].join("\n\n");
  }

  return [
    `This run produced ${briefing.candidates.length} opportunities: ${joinAnd(names)}.`,
    ...qualified,
    ...blocked,
    "Each opportunity is a signal combination, not a list of every object Enigma found.",
  ].join("\n\n");
}

function lookupSignal(
  signals: IntelligenceBriefing["signals"],
  key: SignalKey,
) {
  return signals.find(
    (signal) => resolveSignalKey(signal.key, signal.title) === key,
  );
}

function requiredSignalTitle(key: SignalKey) {
  return signalAdvice({ key, title: key }).title;
}

function supportingRefs(items: string[]) {
  return items.map((item) => {
    const match = item.match(/^(.*?)\s+\((strong|mixed|weak)\)$/i);
    return {
      title: (match?.[1] ?? item).trim(),
      strength: (match?.[2]?.toLowerCase() ?? "mixed") as
        | "strong"
        | "mixed"
        | "weak",
    };
  });
}

function asSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
}

function lowerStart(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
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

function matchesPhrase(haystack: string, value: string) {
  const hay = normalizeAsk(haystack);
  const needle = normalizeAsk(value);
  if (!needle) {
    return false;
  }

  if (hay.includes(needle)) {
    return true;
  }

  const words = needle.split(" ").filter((word) => word.length > 2);
  return words.length > 0 && words.every((word) => hay.includes(word));
}

function normalizeAsk(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
