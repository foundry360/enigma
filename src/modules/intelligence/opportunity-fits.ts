import type { OrgIntelligence } from "@/modules/intelligence/org-model";
import type { BusinessSignal } from "@/modules/intelligence/types";

export type WorkFitPoolItem = {
  apiName: string;
  label: string;
  custom: boolean;
  fieldCount: number;
  customFieldCount: number;
  hasLifecycle: boolean;
  usedInModel: boolean;
  role: "primary" | "secondary" | "context";
  score: number;
};

export type OpportunityFit = {
  apiName: string;
  label: string;
  selected: boolean;
  rank: number;
  reason: string;
  risk: string;
  recommendation: string;
  judgedBy?: string;
  supportingFindingIds?: string[];
  supportingSignalIds?: string[];
  confidence?: "high" | "medium" | "low";
};

export function stampOpportunityFits(
  fits: OpportunityFit[],
  judgedBy: string,
): OpportunityFit[] {
  return fits.map((fit) => ({
    ...fit,
    judgedBy,
    reason: fit.reason
      ? `${fit.reason} Fit judged by ${judgedBy}.`
      : `Fit judged by ${judgedBy}.`,
  }));
}

export function opportunityReasonPrompt(input: {
  projectType: string;
  objective: string;
  outcomes: string[];
  work: WorkFitPoolItem[];
  signals: Array<{
    key?: string;
    title: string;
    strength: string;
    score: number;
    meaning: string;
  }>;
  orgSummary?: {
    learned: string[];
    notObserved: string[];
    meaning: string;
    constraints: string[];
    nextStep: string;
  };
  findings?: Array<{
    id: string;
    title: string;
    summary: string;
    domain: string;
    provenance: string;
    confidence: string;
  }>;
  gaps?: Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
  }>;
}) {
  const pool = input.work
    .map(
      (item) =>
        `- ${item.label} (${item.apiName}). ${item.custom ? "Custom" : "Standard"}. ${item.fieldCount} fields, ${item.customFieldCount} custom. ${item.hasLifecycle ? "Has a status or stage path." : "No status or stage path observed."} ${item.usedInModel ? "In the operating model." : "Catalog presence only."} Metadata score ${item.score}.`,
    )
    .join("\n");
  const signals = input.signals
    .map(
      (signal) =>
        `- ${signal.key ? `${signal.key}. ` : ""}${signal.title}: ${signal.strength} ${signal.score}. ${signal.meaning}`,
    )
    .join("\n");
  const findings = (input.findings ?? [])
    .map(
      (item) =>
        `- ${item.id}. ${item.title} [${item.domain}/${item.provenance}/${item.confidence}]. ${item.summary}`,
    )
    .join("\n");
  const gaps = (input.gaps ?? [])
    .map((item) => `- ${item.id}. ${item.title} [${item.impact}]. ${item.description}`)
    .join("\n");

  return {
    system: [
      "You are Enigma Synthetic Intelligence.",
      "Org Intelligence, findings, signals, and gaps are already complete. Do not construct or alter that model.",
      "Judge which opportunities best fit this organization's observed conditions and this project's objective.",
      "You may select, rank, reject, explain, name opportunity-specific risk, and recommend next validation.",
      "You may select more than one object when more than one is a real fit.",
      "If several durable work objects are in use, select every object that is a real fit for this project. Do not collapse a large pool to one or two names unless the others are clearly not this work.",
      "You may reject licensed or custom objects that are not a fit for this project.",
      "You may only name objects listed in the work pool.",
      "Do not invent Salesforce objects, volumes, data quality, prices, or capabilities.",
      "Do not treat unknown as false. If volume, quality, handoff, or freshness was not observed, say so.",
      "Use each signal's exact strength. If Grounded answers is weak or mixed, do not say grounding is present, ready, or strong. Unobserved article content is not a knowledge base.",
      "Cite supportingFindingIds and supportingSignalIds from the provided lists only.",
      'Return JSON only: {"fits":[{"apiName":"","selected":true,"rank":1,"reason":"","risk":"","recommendation":"","supportingFindingIds":[],"supportingSignalIds":[],"confidence":"high"}]}.',
    ].join(" "),
    user: [
      `Project type: ${input.projectType}`,
      `Objective: ${input.objective}`,
      `Outcomes: ${input.outcomes.join("; ") || "None listed."}`,
      input.orgSummary
        ? `Org intelligence summary.\nLearned: ${input.orgSummary.learned.join(" ") || "None."}\nNot observed: ${input.orgSummary.notObserved.join("; ") || "None."}\nMeaning: ${input.orgSummary.meaning}\nConstraints: ${input.orgSummary.constraints.join("; ")}\nNext step: ${input.orgSummary.nextStep}`
        : null,
      `Durable work pool:\n${pool || "None."}`,
      `Findings:\n${findings || "None."}`,
      `Signals:\n${signals || "None."}`,
      `Intelligence gaps:\n${gaps || "None."}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function parseOpportunityFits(
  raw: string,
  pool: Pick<WorkFitPoolItem, "apiName" | "label">[],
): OpportunityFit[] {
  const parsed = extractJson(raw);
  const nested =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { fits?: unknown }).fits
      : null;
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(nested)
      ? nested
      : [];
  const allowed = new Map(pool.map((item) => [item.apiName, item]));
  const fits: OpportunityFit[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const apiName = String((row as { apiName?: unknown }).apiName ?? "");
    const work = allowed.get(apiName);
    if (!work) {
      continue;
    }
    fits.push({
      apiName: work.apiName,
      label: work.label,
      selected: (row as { selected?: unknown }).selected !== false,
      rank: Number((row as { rank?: unknown }).rank) || fits.length + 1,
      reason: String((row as { reason?: unknown }).reason ?? "").slice(0, 600),
      risk: String((row as { risk?: unknown }).risk ?? "").slice(0, 400),
      recommendation: String(
        (row as { recommendation?: unknown }).recommendation ?? "",
      ).slice(0, 400),
      supportingFindingIds: stringIds(
        (row as { supportingFindingIds?: unknown }).supportingFindingIds,
      ),
      supportingSignalIds: stringIds(
        (row as { supportingSignalIds?: unknown }).supportingSignalIds,
      ),
      confidence: parseConfidence((row as { confidence?: unknown }).confidence),
    });
  }

  return fits.sort((left, right) => left.rank - right.rank);
}

export function fallbackOpportunityFits(
  pool: WorkFitPoolItem[],
): OpportunityFit[] {
  return pool
    .filter((item) => item.usedInModel && item.role !== "context")
    .sort((left, right) => right.score - left.score)
    .map((item, index) => ({
      apiName: item.apiName,
      label: item.label,
      selected: true,
      rank: index + 1,
      reason:
        "Ranked from metadata on this run. A model pass was not available to judge fit against the project objective.",
      risk: `Write-back on ${item.label} without a narrow topic will create incomplete updates.`,
      recommendation: `Validate how ${item.label} is assigned and closed before designing a topic.`,
    }));
}

export function groundOpportunityFits(
  fits: OpportunityFit[],
  intelligence: OrgIntelligence,
  signals: BusinessSignal[],
): OpportunityFit[] {
  const findingIds = new Set(intelligence.findings.map((item) => item.id));
  const signalIds = new Set<string>(signals.map((item) => item.key));

  return fits.map((fit) => {
    const fromModel = defaultSupportingFindings(fit, intelligence);
    const fromSignals = defaultSupportingSignals(signals);
    const supportingFindingIds = uniqueStrings([
      ...(fit.supportingFindingIds ?? []).filter((id) => findingIds.has(id)),
      ...fromModel,
    ]);
    const supportingSignalIds = uniqueStrings([
      ...(fit.supportingSignalIds ?? []).filter((id) => signalIds.has(id)),
      ...fromSignals,
    ]);

    const derived = confidenceFromSignals(
      signals.filter((signal) => supportingSignalIds.includes(signal.key)),
    );

    return {
      ...fit,
      supportingFindingIds,
      supportingSignalIds,
      confidence: derived === "low" ? "low" : (fit.confidence ?? derived),
    };
  });
}

export function resolveOpportunityFits(
  raw: string | null,
  pool: WorkFitPoolItem[],
  intelligence?: OrgIntelligence,
  signals?: BusinessSignal[],
): OpportunityFit[] {
  const parsed = raw ? parseOpportunityFits(raw, pool) : [];
  const resolved = parsed.some((item) => item.selected)
    ? parsed
    : fallbackOpportunityFits(pool);
  if (!intelligence || !signals) {
    return resolved;
  }
  return groundOpportunityFits(resolved, intelligence, signals);
}

function defaultSupportingFindings(
  fit: OpportunityFit,
  intelligence: OrgIntelligence,
) {
  const primary = intelligence.workload.primary[0];
  return intelligence.findings
    .filter((item) => {
      if (item.id.startsWith("work-") || item.id.startsWith("process-")) {
        return (
          item.title.includes(fit.label) ||
          (primary && item.title.includes(primary.label))
        );
      }
      return (
        item.id === "knowledge-present" ||
        item.id === "automation-thin" ||
        item.id === "automation-present" ||
        item.id === "data-requiredness"
      );
    })
    .map((item) => item.id)
    .slice(0, 6);
}

function defaultSupportingSignals(signals: BusinessSignal[]) {
  return signals.map((signal) => signal.key);
}

function confidenceFromSignals(signals: BusinessSignal[]): "high" | "medium" | "low" {
  if (signals.some((signal) => signal.strength === "weak")) {
    return "low";
  }
  if (signals.every((signal) => signal.strength === "strong") && signals.length > 0) {
    return "high";
  }
  return "medium";
}

function stringIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .map((item) => item.slice(0, 80)),
  );
}

function parseConfidence(value: unknown): "high" | "medium" | "low" | undefined {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : undefined;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced?.[1] ?? raw).trim();
  const start = text.search(/[\[{]/);
  if (start < 0) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}
