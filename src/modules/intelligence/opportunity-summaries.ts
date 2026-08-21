import type { CandidateSignalRef } from "@/lib/db/types";
import { resolveSignalKey } from "@/modules/intelligence/signal-advice";
import { strengthFromSignal } from "@/modules/intelligence/strength";

export function summarizeBusinessContext(input: {
  area: string;
  process: string;
  capability: string;
}) {
  return `This work sits in ${input.area}. The process is ${lowerStart(input.process)}, and the recommended capability is ${lowerStart(input.capability)}.`;
}

export function summarizeSupportingSignals(
  signals: Array<Pick<CandidateSignalRef, "title" | "strength"> & Partial<CandidateSignalRef>>,
) {
  if (signals.length === 0) {
    return "No supporting signals were inherited on this opportunity.";
  }

  const resolved = signals.map((signal) => ({
    ...signal,
    strength: strengthFromSignal({
      strength: signal.strength,
      score: "score" in signal ? signal.score : undefined,
    }),
  }));
  const strong = names(resolved, "strong");
  const mixed = names(resolved, "mixed");
  const weak = names(resolved, "weak");
  const parts: string[] = [];

  if (strong.length > 0) {
    parts.push(
      `${joinAnd(strong)} ${strong.length === 1 ? "is" : "are"} strong`,
    );
  }
  if (mixed.length > 0) {
    parts.push(
      `${joinAnd(mixed)} ${mixed.length === 1 ? "is" : "are"} mixed`,
    );
  }
  if (weak.length > 0) {
    parts.push(
      `${joinAnd(weak)} ${weak.length === 1 ? "is" : "are"} still weak, so the path is supported but not unconstrained`,
    );
  }

  return ensureSentence(parts.join(". "));
}

export function scrubFitReason(
  reason: string,
  signals: Array<{
    key?: string;
    title: string;
    strength: string;
    score?: number;
  }>,
) {
  let next = reason.trim();
  if (!next) {
    return "";
  }

  for (const signal of signals) {
    const strength = strengthFromSignal({
      strength: signal.strength as CandidateSignalRef["strength"],
      score: signal.score,
    });
    if (strength === "strong") {
      continue;
    }

    const key = resolveSignalKey(signal.key, signal.title);
    if (key === "grounded_answers") {
      next = next
        .replace(/\bwork, path, and grounding support/gi, "work and path support")
        .replace(/\bwork, path, and grounding are present/gi, "work and path are in view")
        .replace(/\bpath, and grounding are present/gi, "path is in view")
        .replace(/\band grounding\b/gi, "")
        .replace(/\bgrounding (are|is) present\b/gi, "")
        .replace(/\bgrounding support[s]?\b/gi, "")
        .replace(/\bwith grounding\b/gi, "")
        .replace(/\bgrounded answers is strong\b/gi, "grounded answers is still weak");
    }
  }

  return next.replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
}

export function alignReasonToOpportunity(
  reason: string,
  opportunityName?: string | null,
) {
  const name = opportunityName?.trim();
  const next = reason.trim();
  if (!name || !next) {
    return next;
  }

  if (/\bservice agent\b/i.test(name)) {
    return next;
  }

  return next
    .replace(/\bthe service agent\b/gi, name)
    .replace(/\ba service agent\b/gi, name)
    .replace(/\bservice agent\b/gi, name);
}

export function summarizeImplication(title: string, items: string[]) {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) {
    return "Nothing was listed for this layer.";
  }

  const list = joinAnd(clean.map((item, index) => (index === 0 ? lowerStart(item) : lowerStart(item))));

  if (/consumption/i.test(title)) {
    return `Consumption would show up as ${list}.`;
  }
  if (/value/i.test(title)) {
    return `Value comes from ${list}.`;
  }
  if (/constraint/i.test(title)) {
    return `Watch ${list}.`;
  }
  if (/dependenc/i.test(title)) {
    return `This work needs ${list}.`;
  }

  return ensureSentence(list);
}

function names(
  signals: Array<Pick<CandidateSignalRef, "title" | "strength">>,
  strength: CandidateSignalRef["strength"],
) {
  return signals
    .filter((signal) => signal.strength === strength)
    .map((signal) => signal.title);
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

function lowerStart(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
}
