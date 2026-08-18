import type {
  Evidence,
  Judgment,
  SignalContext,
  SignalKey,
} from "@/modules/intelligence/types";

export type OpportunityDefinition = {
  key: string;
  title: string;
  process: string;
  requiredSignals: SignalKey[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  reason: string;
  risk: string;
  recommendation: string;
};

export const opportunityCatalog: OpportunityDefinition[] = [
  {
    key: "case_service_agent",
    title: "Service agent",
    process: "Service work handling",
    requiredSignals: [
      "addressable_work",
      "operating_path",
      "grounded_answers",
    ],
    consumptionDrivers: ["Work volume", "Sessions", "Escalations"],
    valueDrivers: ["Handle time", "Resolution rate"],
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
    requiredSignals: ["grounded_answers", "access_surface"],
    consumptionDrivers: ["Retrieval turns", "Sessions"],
    valueDrivers: ["Handle time", "Productivity"],
    reason:
      "Approved content and a usable access surface support a grounded Q&A hypothesis.",
    risk: "Stale or thin articles will show up as confident wrong answers.",
    recommendation:
      "Review this candidate and use retrieval on one high-volume reason before write-back.",
  },
  {
    key: "guided_case_flow",
    title: "Guided workflow",
    process: "Guided operating path",
    requiredSignals: ["operating_path", "writeback_control"],
    consumptionDrivers: ["Actions", "Workflow runs"],
    valueDrivers: ["Automation", "Handle time"],
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
  return opportunityCatalog.flatMap((definition) => {
    const supporting = definition.requiredSignals.filter((key) => {
      const signal = context.signals.find((item) => item.key === key);
      return signal && signal.strength !== "weak";
    });

    if (supporting.length < definition.requiredSignals.length) {
      return [];
    }

    const scores = supporting.map(
      (key) => context.signals.find((item) => item.key === key)?.score ?? 0,
    );
    const score = Math.round(
      scores.reduce((sum, value) => sum + value, 0) / scores.length,
    );

    return [
      {
        kind: "opportunity" as const,
        key: definition.key,
        title: definition.title,
        score,
        evidence: evidenceFromSignals(context, definition.requiredSignals),
        reason: definition.reason,
        risk: definition.risk,
        recommendation: definition.recommendation,
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
