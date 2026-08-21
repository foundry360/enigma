import type { OpportunityFit } from "@/modules/intelligence/opportunity-fits";
import { forecastConfidence } from "@/modules/intelligence/consumption";
import { alignReasonToOpportunity, summarizeSupportingSignals, scrubFitReason } from "@/modules/intelligence/opportunity-summaries";
import { signalState } from "@/modules/intelligence/strength";
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

const watchSignals: SignalKey[] = [
  "addressable_work",
  "operating_path",
  "grounded_answers",
  "writeback_control",
  "automation_collision",
  "access_surface",
];

export function opportunityKey(apiName: string) {
  return `work:${apiName}`;
}

export function opportunityDefinition(
  key: string,
  title?: string,
): OpportunityDefinition | null {
  const work = workFromKey(key);
  if (!work) {
    return null;
  }

  return definitionForWork(
    work.apiName,
    workLabelFromTitle(title ?? work.label),
  );
}

export function detectOpportunityCandidates(
  context: SignalContext,
  fits?: OpportunityFit[],
): Judgment[] {
  return draftOpportunityCandidates(context, fits).map((draft) => ({
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
  fits?: OpportunityFit[],
): CandidateDraft[] {
  const work = context.work.filter((item) => item.role !== "context");
  const fitByApi = new Map((fits ?? []).map((fit) => [fit.apiName, fit]));
  const selected = (fits ?? [])
    .filter((item) => item.selected)
    .sort((left, right) => left.rank - right.rank);
  const selectedNames = new Set(selected.map((item) => item.apiName));
  const ordered = [
    ...selected.flatMap((fit) => {
      const item = work.find((entry) => entry.apiName === fit.apiName);
      return item ? [item] : [];
    }),
    ...work.filter((item) => !selectedNames.has(item.apiName)),
  ];

  return ordered.map((item) => {
    const draft = draftForWork(item, context);
    const fit = fitByApi.get(item.apiName);
    if (!fit?.reason) {
      return draft;
    }
    return {
      ...draft,
      finding: `${opportunityFinding(draft.supportingSignals, fit.reason, draft.title)}`,
      reason: `${opportunityFinding(draft.supportingSignals, fit.reason, draft.title)}`,
      risk: fit.risk || draft.risk,
      recommendation: fit.recommendation || draft.recommendation,
    };
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

  return judgments.flatMap((judgment) => {
    if (judgment.kind !== "opportunity") {
      return [];
    }

    const definition =
      opportunityDefinition(judgment.key, judgment.title) ??
      definitionForWork(judgment.key, workLabelFromTitle(judgment.title));
    const supporting = watchSignals.flatMap((key) => {
      const signal = signals.find((item) => item.key === key);
      return signal ? [signal] : [];
    });

    const supportingSignals = supporting.map((signal) => ({
      key: signal.key as SignalKey,
      title: signal.title,
      strength: signalState(signal.score),
      score: signal.score,
    }));
    const finding = judgment.reason;

    return [
      {
        key: judgment.key,
        title: judgment.title,
        score: judgment.score,
        description: definition.description,
        candidateType: judgment.key,
        businessArea: definition.businessArea,
        businessProcess: definition.process,
        recommendedCapability: definition.recommendedCapability,
        supportingSignals,
        evidence: (judgment.evidence ?? []) as Evidence[],
        finding,
        confidence: forecastConfidence(judgment.score),
        consumptionDrivers: definition.consumptionDrivers,
        valueDrivers: definition.valueDrivers,
        constraints: definition.constraints,
        dependencies: definition.dependencies,
        reason: finding,
        risk: judgment.risk || definition.risk,
        recommendation: judgment.recommendation || definition.recommendation,
      },
    ];
  });
}

function draftForWork(
  work: SignalContext["work"][number],
  context: SignalContext,
): CandidateDraft {
  const definition = definitionForWork(work.apiName, work.label);
  const supporting = watchSignals.flatMap((key) => {
    const signal = context.signals.find((item) => item.key === key);
    return signal ? [signal] : [];
  });
  const score = Math.round(
    supporting.reduce((sum, signal) => sum + signal.score, 0) /
      Math.max(supporting.length, 1),
  );

  return {
    key: definition.key,
    title: definition.title,
    score,
    description: definition.description,
    candidateType: definition.key,
    businessArea: definition.businessArea,
    businessProcess: definition.process,
    recommendedCapability: definition.recommendedCapability,
    supportingSignals: supporting.map((signal) => ({
      key: signal.key,
      title: signal.title,
      strength: signal.strength,
      score: signal.score,
    })),
    evidence: [
      {
        tool: "list_objects",
        citation: `${work.label} (${work.apiName}) is the durable work this opportunity sits on.`,
      },
      ...evidenceFromSignals(
        context,
        supporting.map((signal) => signal.key),
      ),
    ],
    finding: opportunityFinding(supporting, definition.reason, definition.title),
    confidence: forecastConfidence(score),
    consumptionDrivers: definition.consumptionDrivers,
    valueDrivers: definition.valueDrivers,
    constraints: definition.constraints,
    dependencies: definition.dependencies,
    reason: opportunityFinding(supporting, definition.reason, definition.title),
    risk: definition.risk,
    recommendation: definition.recommendation,
  };
}

function definitionForWork(apiName: string, label: string): OpportunityDefinition {
  const name = label.trim() || labelFromApiName(apiName);

  return {
    key: opportunityKey(apiName),
    title: `${name} agent`,
    process: `${name} handling`,
    description: `An agent sitting on ${name}, using the path and controls this org already has around that record.`,
    businessArea: name,
    recommendedCapability: `${name} agent`,
    requiredSignals: ["addressable_work", "operating_path"],
    watchSignals,
    consumptionDrivers: [
      `Conversations the agent would answer or continue on ${name}`,
      `Agent sessions opened against existing ${name} records`,
      `${name} work completed without a person taking the record`,
      `Knowledge retrieval used to ground each answer`,
    ],
    valueDrivers: [
      `Less time spent handling each ${name} record`,
      `A higher share of ${name} work finished on the first pass`,
      `Fewer ${name} records escalated`,
      `Faster first response on inbound ${name} work`,
    ],
    constraints: [
      "Existing automation may collide with agent writes",
      "Write-back controls must stay narrow",
      "Agent identity should not reuse a broad human profile",
    ],
    dependencies: [
      `${name} as the durable work record`,
      "Approved content for the first topic",
      "A single handoff path",
    ],
    reason: `${name} is the durable work this run found, so the agent hypothesis sits on that record.`,
    risk: `Write-back on ${name} without a narrow topic will create incomplete or ungrounded updates.`,
    recommendation: `Review this candidate, then pilot one ${name} topic before expanding to close or create.`,
  };
}

function workFromKey(key: string) {
  if (!key.startsWith("work:")) {
    return null;
  }

  const apiName = key.slice(5);
  if (!apiName) {
    return null;
  }

  return { apiName, label: labelFromApiName(apiName) };
}

function workLabelFromTitle(title: string) {
  return title.replace(/\s+agent$/i, "").trim() || title;
}

function labelFromApiName(apiName: string) {
  return apiName
    .replace(/__c$/i, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function opportunityFinding(
  signals: Array<{
    key?: string;
    title: string;
    strength: SignalStrength;
    score: number;
  }>,
  reason: string,
  opportunityName: string,
) {
  return `${summarizeSupportingSignals(signals)} ${alignReasonToOpportunity(scrubFitReason(reason, signals), opportunityName)}`.trim();
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
