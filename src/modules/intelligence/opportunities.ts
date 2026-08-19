import { forecastConfidence } from "@/modules/intelligence/consumption";
import type {
  Evidence,
  Judgment,
  SignalContext,
  SignalKey,
  SignalStrength,
} from "@/modules/intelligence/types";

export type OpportunityDefinition = {
  key: string;
  title: string;
  process: string;
  description: string;
  businessArea: string;
  recommendedCapability: string;
  requiredSignals: SignalKey[];
  watchSignals: SignalKey[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies: string[];
  reason: string;
  risk: string;
  recommendation: string;
};

export type CandidateDraft = {
  key: string;
  title: string;
  score: number;
  description: string;
  candidateType: string;
  businessArea: string;
  businessProcess: string;
  recommendedCapability: string;
  supportingSignals: {
    key: SignalKey;
    title: string;
    strength: SignalStrength;
    score: number;
  }[];
  evidence: Evidence[];
  finding: string;
  confidence: "high" | "medium" | "low";
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies: string[];
  reason: string;
  risk: string;
  recommendation: string;
};

export const opportunityCatalog: OpportunityDefinition[] = [
  {
    key: "case_service_agent",
    title: "Service agent",
    process: "Service work handling",
    description:
      "High-volume recurring service activity with a defined operating path and available grounding sources.",
    businessArea: "Service",
    recommendedCapability: "Service agent",
    requiredSignals: [
      "addressable_work",
      "operating_path",
      "grounded_answers",
    ],
    watchSignals: ["writeback_control", "automation_collision", "access_surface"],
    consumptionDrivers: [
      "Customer conversations the agent would answer or continue",
      "Agent sessions opened against existing service work",
      "Service requests resolved without a person taking the work",
      "Knowledge retrieval used to ground each answer",
    ],
    valueDrivers: [
      "Less time spent handling each service request",
      "A higher share of work resolved on the first pass",
      "Fewer cases escalated to a specialist or supervisor",
      "Faster first response on inbound service work",
    ],
    constraints: [
      "Existing automation may collide with agent writes",
      "Write-back controls must stay narrow",
      "Agent identity should not reuse a broad human profile",
    ],
    dependencies: [
      "A durable service work object",
      "Approved content for the first topic",
      "A single handoff path",
    ],
    reason:
      "Addressable work, an operating path, and grounded answers are present, so a service agent is a supported hypothesis.",
    risk: "Write-back without a narrow topic will create incomplete or ungrounded updates.",
    recommendation:
      "Review this candidate, then pilot one service topic before expanding to close or create.",
  },
  {
    key: "knowledge_assist",
    title: "Grounded Q&A",
    process: "Trusted answer retrieval",
    description:
      "Existing knowledge sources and usable access control provide a potential grounding layer.",
    businessArea: "Service",
    recommendedCapability: "Grounded Q&A",
    requiredSignals: ["grounded_answers", "access_surface"],
    watchSignals: ["writeback_control", "addressable_work"],
    consumptionDrivers: [
      "Retrieval turns against approved content",
      "Agent sessions used to look up a trusted answer",
    ],
    valueDrivers: [
      "Less time spent searching for a trusted answer",
      "Fewer human touches to repeat the same explanation",
      "More time back to the people who currently look this up by hand",
    ],
    constraints: [
      "Stale or thin articles will show up as confident wrong answers",
      "Write-back should wait until retrieval is trusted",
    ],
    dependencies: [
      "Approved content on one high-volume reason",
      "A dedicated agent identity",
    ],
    reason:
      "Approved content and usable access control support a grounded Q&A hypothesis.",
    risk: "Stale or thin articles will show up as confident wrong answers.",
    recommendation:
      "Review this candidate and use retrieval on one high-volume reason before write-back.",
  },
  {
    key: "guided_case_flow",
    title: "Guided workflow",
    process: "Guided operating path",
    description:
      "A repeatable operating path exists, so an agent can participate without inventing the process.",
    businessArea: "Operations",
    recommendedCapability: "Guided workflow",
    requiredSignals: ["operating_path", "writeback_control"],
    watchSignals: ["automation_collision", "addressable_work"],
    consumptionDrivers: [
      "Actions the agent takes on a record",
      "Workflow runs that complete a step in the path",
      "Records processed through the guided path",
    ],
    valueDrivers: [
      "More of the repeatable path completed without a person",
      "Less time spent moving work to the next step",
      "Fewer human touches to keep the process moving",
    ],
    constraints: [
      "Dense automation can turn the agent into a shadow process",
      "Assignment and SLAs may still be informal",
    ],
    dependencies: [
      "One documented handoff",
      "A single topic paired with write-back",
    ],
    reason:
      "A repeatable path and write-back controls support a guided workflow hypothesis.",
    risk: "The agent may become a shadow process if assignment and SLAs stay informal.",
    recommendation:
      "Review this candidate and pair one topic with a single handoff, not a full rewrite.",
  },
];

export function opportunityDefinition(key: string) {
  return opportunityCatalog.find((item) => item.key === key) ?? null;
}

export function detectOpportunityCandidates(
  context: SignalContext,
): Judgment[] {
  return draftOpportunityCandidates(context).map((draft) => ({
    kind: "opportunity" as const,
    key: draft.key,
    title: draft.title,
    score: draft.score,
    evidence: draft.evidence,
    reason: draft.reason,
    risk: draft.risk,
    recommendation: draft.recommendation,
  }));
}

export function draftOpportunityCandidates(
  context: SignalContext,
): CandidateDraft[] {
  return opportunityCatalog.flatMap((definition) => {
    const required = definition.requiredSignals.map((key) => {
      const signal = context.signals.find((item) => item.key === key);
      return signal ?? null;
    });

    if (
      required.some((signal) => !signal || signal.strength === "weak")
    ) {
      return [];
    }

    const supporting = [
      ...required.filter((signal): signal is NonNullable<typeof signal> =>
        Boolean(signal),
      ),
      ...definition.watchSignals.flatMap((key) => {
        const signal = context.signals.find((item) => item.key === key);
        return signal ? [signal] : [];
      }),
    ];
    const unique = [
      ...new Map(supporting.map((signal) => [signal.key, signal])).values(),
    ];
    const requiredScores = required.map((signal) => signal?.score ?? 0);
    const score = Math.round(
      requiredScores.reduce((sum, value) => sum + value, 0) /
        requiredScores.length,
    );

    return [
      {
        key: definition.key,
        title: definition.title,
        score,
        description: definition.description,
        candidateType: definition.key,
        businessArea: definition.businessArea,
        businessProcess: definition.process,
        recommendedCapability: definition.recommendedCapability,
        supportingSignals: unique.map((signal) => ({
          key: signal.key,
          title: signal.title,
          strength: signal.strength,
          score: signal.score,
        })),
        evidence: evidenceFromSignals(
          context,
          unique.map((signal) => signal.key),
        ),
        finding: definition.reason,
        confidence: forecastConfidence(score),
        consumptionDrivers: definition.consumptionDrivers,
        valueDrivers: definition.valueDrivers,
        constraints: definition.constraints,
        dependencies: definition.dependencies,
        reason: definition.reason,
        risk: definition.risk,
        recommendation: definition.recommendation,
      },
    ];
  });
}

export function hydrateCandidateDrafts(
  judgments: {
    kind: string;
    key: string;
    title: string;
    score: number;
    evidence: { tool: string; citation: string }[];
    reason: string;
    risk: string;
    recommendation: string;
  }[],
): CandidateDraft[] {
  const signals = judgments.filter((item) => item.kind === "dimension");
  const emitted = new Set(
    judgments
      .filter((item) => item.kind === "opportunity")
      .map((item) => item.key),
  );

  return opportunityCatalog.flatMap((definition) => {
    if (!emitted.has(definition.key)) {
      return [];
    }

    const required = definition.requiredSignals.map((key) =>
      signals.find((item) => item.key === key),
    );
    if (required.some((signal) => !signal)) {
      return [];
    }

    const supporting = [
      ...required.filter((signal): signal is NonNullable<typeof signal> =>
        Boolean(signal),
      ),
      ...definition.watchSignals.flatMap((key) => {
        const signal = signals.find((item) => item.key === key);
        return signal ? [signal] : [];
      }),
    ];
    const unique = [
      ...new Map(supporting.map((signal) => [signal.key, signal])).values(),
    ];
    const judgment = judgments.find(
      (item) => item.kind === "opportunity" && item.key === definition.key,
    );
    const score = judgment?.score ?? 0;

    return [
      {
        key: definition.key,
        title: definition.title,
        score,
        description: definition.description,
        candidateType: definition.key,
        businessArea: definition.businessArea,
        businessProcess: definition.process,
        recommendedCapability: definition.recommendedCapability,
        supportingSignals: unique.map((signal) => ({
          key: signal.key as SignalKey,
          title: signal.title,
          strength:
            signal.score >= 75
              ? "strong"
              : signal.score >= 45
                ? "mixed"
                : "weak",
          score: signal.score,
        })),
        evidence: (judgment?.evidence ?? []) as Evidence[],
        finding: judgment?.reason ?? definition.reason,
        confidence: forecastConfidence(score),
        consumptionDrivers: definition.consumptionDrivers,
        valueDrivers: definition.valueDrivers,
        constraints: definition.constraints,
        dependencies: definition.dependencies,
        reason: judgment?.reason ?? definition.reason,
        risk: judgment?.risk ?? definition.risk,
        recommendation: judgment?.recommendation ?? definition.recommendation,
      },
    ];
  });
}

function evidenceFromSignals(
  context: SignalContext,
  keys: SignalKey[],
): Evidence[] {
  return keys.flatMap((key) => {
    const signal = context.signals.find((item) => item.key === key);
    if (!signal) {
      return [];
    }

    return signal.evidence.map((entry) => ({
      tool: entry.tool,
      citation: `${signal.title}: ${entry.citation}`,
    }));
  });
}
