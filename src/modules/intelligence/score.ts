import { detectOpportunityCandidates } from "@/modules/intelligence/opportunities";
import { normalizeSignals } from "@/modules/intelligence/signals";
import type {
  AssessmentFacts,
  BusinessSignal,
  Judgment,
} from "@/modules/intelligence/types";

export function scoreAssessment(facts: AssessmentFacts): Judgment[] {
  const context = normalizeSignals(facts);
  return [
    ...context.signals.map(judgmentFromSignal),
    ...detectOpportunityCandidates(context),
  ];
}

export type ReadinessRisk = "low" | "medium" | "high";

export function readinessRisk(score: number | null): ReadinessRisk | null {
  if (score === null) {
    return null;
  }

  if (score >= 75) {
    return "low";
  }

  if (score >= 45) {
    return "medium";
  }

  return "high";
}

export function overallFinding(input: {
  overallScore: number;
  dimensions: { title: string; score: number }[];
}) {
  const strongest = [...input.dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .filter((item) => item.score >= 70);
  const weakest = [...input.dimensions]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .filter((item) => item.score < 70);

  if (input.dimensions.length === 0) {
    return "No business signals were produced. Run intelligence against a connected environment.";
  }

  const headline =
    input.overallScore >= 75
      ? "Signals are strong enough to pilot a narrow Agentforce topic."
      : input.overallScore >= 45
        ? "Some signals support an agent, but consumption would be uneven."
        : "Signals are too weak for a customer-facing agent without foundational work.";

  const strength =
    strongest.length > 0
      ? ` Strongest: ${strongest.map((item) => `${item.title} ${item.score}`).join(", ")}.`
      : "";
  const gap =
    weakest.length > 0
      ? ` Gaps: ${weakest.map((item) => `${item.title} ${item.score}`).join(", ")}.`
      : "";

  return `${headline}${strength}${gap}`;
}

export function overallScore(judgments: { kind: string; score: number }[]) {
  const dimensions = judgments.filter((item) => item.kind === "dimension");
  if (dimensions.length === 0) {
    return 0;
  }

  return Math.round(
    dimensions.reduce((sum, item) => item.score + sum, 0) / dimensions.length,
  );
}

export function scoreReadiness(facts: AssessmentFacts): Judgment[] {
  return normalizeSignals(facts).signals.map(judgmentFromSignal);
}

export function detectOpportunities(facts: AssessmentFacts): Judgment[] {
  return detectOpportunityCandidates(normalizeSignals(facts));
}

function judgmentFromSignal(signal: BusinessSignal): Judgment {
  return {
    kind: "dimension",
    key: signal.key,
    title: signal.title,
    score: signal.score,
    evidence: signal.evidence,
    reason: `${signal.meaning}\n\n${signal.consumption}`,
    risk: signal.risk,
    recommendation: signal.recommendation,
  };
}

export function signalState(score: number) {
  if (score >= 75) {
    return "strong" as const;
  }

  if (score >= 45) {
    return "mixed" as const;
  }

  return "weak" as const;
}
