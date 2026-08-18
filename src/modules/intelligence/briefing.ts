import { splitSignalCopy } from "@/modules/intelligence/signals";
import { signalState } from "@/modules/intelligence/score";

export type IntelligenceBriefing = {
  environment: string;
  status: string;
  factCount: number;
  signals: {
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
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
  }[];
};

const priceAsk =
  /price|pricing|cost|dollar|roi|payback|roa|roc|license|\$\d/i;

export function isPriceAsk(question: string) {
  return priceAsk.test(question);
}

export function buildIntelligenceBriefing(input: {
  environment: string;
  status: string;
  factCount: number;
  signals: {
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
    consumptionDrivers: string[];
    valueDrivers: string[];
    constraints: string[];
  }[];
}): IntelligenceBriefing {
  return {
    environment: input.environment,
    status: input.status,
    factCount: input.factCount,
    signals: input.signals.map((signal) => {
      const copy = splitSignalCopy(signal.reason);
      return {
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
      consumptionDrivers: candidate.consumptionDrivers,
      valueDrivers: candidate.valueDrivers,
      constraints: candidate.constraints,
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
      return `${candidate.name} (${candidate.confidence} confidence, ${candidate.status}): ${candidate.finding} Supported by ${candidate.supporting.join(", ") || "no supporting signals"}. Potential consumption drivers: ${candidate.consumptionDrivers.join(", ")}. Potential value drivers: ${candidate.valueDrivers.join(", ")}. Constraints: ${candidate.constraints.join(", ")}.`;
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
    asks.push("Why is there only one candidate?");
  } else if (briefing.candidates.length === 0) {
    asks.push("Why were no candidates emitted?");
  } else {
    asks.push("Which candidates did this run produce?");
  }

  if (candidate) {
    asks.push(`What should I watch before promoting ${candidate.name}?`);
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

  if (priceAsk.test(trimmed)) {
    return "This run does not contain official prices, costs, or ROI. Those belong in the Business Case after a candidate is promoted. I can explain consumption drivers as hypotheses, not forecasts.";
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

  if (
    /only one candidate|missing candidate|didn't (see|emit)|not (enough|emitted)|were no candidates/i.test(
      trimmed,
    )
  ) {
    const weak = briefing.signals.filter((signal) => signal.strength === "weak");
    const names = briefing.candidates.map((item) => item.name).join(", ");
    const gaps = weak
      .map((item) => `${item.title} (${item.strength})`)
      .join(", ");
    return [
      briefing.candidates.length === 1
        ? `${briefing.candidates[0].name} is the only candidate because its required signals were mixed or strong.`
        : briefing.candidates.length === 0
          ? "No candidates were emitted. A candidate appears only when every required signal is mixed or strong."
          : `This run produced ${briefing.candidates.length} candidates: ${names}.`,
      gaps
        ? `Weak signals that can block other candidates: ${gaps}.`
        : "No signals are weak.",
      "Candidates are hypotheses from signal combinations, not raw object presence.",
    ].join(" ");
  }

  if (/watch|before promot|constraint/i.test(trimmed)) {
    const candidate = matchedCandidates[0] ?? briefing.candidates[0];
    if (candidate) {
      return `${candidate.name}: ${candidate.constraints.join(" ")} Potential consumption drivers remain hypotheses: ${candidate.consumptionDrivers.join(", ")}.`;
    }
  }

  if (matchedSignals.length > 0) {
    return matchedSignals.map(formatSignalAnswer).join("\n\n");
  }

  if (matchedCandidates.length > 0) {
    return matchedCandidates.map(formatCandidateAnswer).join("\n\n");
  }

  if (/candidate|opportunit|promote|hypothesis/i.test(trimmed)) {
    if (briefing.candidates.length === 0) {
      return "No opportunity candidates were produced from this run. A candidate is emitted only when the required business signals are mixed or strong.";
    }

    return briefing.candidates.map(formatCandidateAnswer).join("\n\n");
  }

  if (/signal|strength|find|what did|what can|environment/i.test(trimmed)) {
    const summary = briefing.signals
      .map((signal) => `${signal.title} is ${signal.strength}`)
      .join("; ");
    return `From ${briefing.environment}, the six business signals are: ${summary}. Ask about a named signal or candidate for the evidence and recommendation.`;
  }

  return "I can only explain this intelligence run. Ask about a business signal, a candidate, supporting evidence, or why a candidate did or did not appear. I will not invent scores, volumes, or prices.";
}

function formatSignalAnswer(signal: IntelligenceBriefing["signals"][number]) {
  const evidence = signal.evidence.length
    ? ` Evidence: ${signal.evidence.join(" ")}`
    : "";
  return `${signal.title} is ${signal.strength}. ${signal.meaning} ${signal.consumption} Risk: ${signal.risk} Recommendation: ${signal.recommendation}.${evidence}`;
}

function formatCandidateAnswer(
  candidate: IntelligenceBriefing["candidates"][number],
) {
  return `${candidate.name} is a ${candidate.confidence}-confidence ${candidate.status}. ${candidate.finding} Supported by ${candidate.supporting.join(", ")}. Potential consumption drivers: ${candidate.consumptionDrivers.join(", ")}. Potential value drivers: ${candidate.valueDrivers.join(", ")}. These drivers are hypotheses, not a consumption forecast.`;
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
