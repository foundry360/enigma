import type { CandidateConfidence, CandidateSignalRef } from "@/lib/db/types";
import type { LineAssumptions } from "@/modules/economics/model";

export type ProposedValue = {
  value: number;
  reason: string;
};

export type ProposedLine = LineAssumptions & {
  annualVolume: number;
  unitPrice: number;
  hoursSavedPerUnit: number;
  hourlyCost: number;
  implementationCost: number | null;
  reasons: Record<keyof LineAssumptions, string>;
};

export type ProposedCaseTiming = {
  conservativeAdoption: number;
  expectedAdoption: number;
  aggressiveAdoption: number;
  baselineDays: number;
  enigmaDays: number;
  reasons: {
    adoption: string;
    baselineDays: string;
    enigmaDays: string;
  };
};

const volumeByRange: Record<string, number> = {
  "1–50": 2500,
  "51–200": 8000,
  "201–1,000": 20000,
  "1,001–5,000": 45000,
  "5,000+": 80000,
};

const unitCostByOpportunity: Record<string, number> = {
  case_service_agent: 1.25,
  knowledge_assist: 0.45,
  guided_case_flow: 0.85,
};

const hoursByOpportunity: Record<string, number> = {
  case_service_agent: 0.25,
  knowledge_assist: 0.1,
  guided_case_flow: 0.2,
};

const volumeShareByOpportunity: Record<string, number> = {
  case_service_agent: 1,
  knowledge_assist: 0.55,
  guided_case_flow: 0.7,
};

export function proposeLineAssumptions(input: {
  candidateKey: string;
  confidence: CandidateConfidence;
  signals: Pick<CandidateSignalRef, "key" | "strength">[];
  constraintCount: number;
  employeeRange: string | null;
}): ProposedLine {
  const work = strengthOf(input.signals, "addressable_work");
  const path = strengthOf(input.signals, "operating_path");

  const orgVolume = volumeByRange[input.employeeRange ?? ""] ?? 8000;
  const share = volumeShareByOpportunity[input.candidateKey] ?? 0.6;
  const annualVolume = niceVolume(orgVolume * share * strengthFactor(work));

  const unitPrice = unitCostByOpportunity[input.candidateKey] ?? 0.75;
  const hoursSavedPerUnit = Number(
    (
      (hoursByOpportunity[input.candidateKey] ?? 0.15) *
      (path === "mixed" ? 0.8 : 1)
    ).toFixed(2),
  );
  const hourlyCost = 85;

  return {
    annualVolume,
    unitPrice,
    hoursSavedPerUnit,
    hourlyCost,
    implementationCost: null,
    reasons: {
      annualVolume: `Deciphered from ${input.employeeRange || "org size"} and Addressable work (${work ?? "unknown"}). Volume is inferred work, not a CRM count.`,
      unitPrice:
        "Enigma working cost for one consumption unit. Not official Salesforce pricing.",
      hoursSavedPerUnit: `Deciphered from the value driver and Operating path (${path ?? "unknown"}).`,
      hourlyCost:
        "Enigma working labor rate for the people who handle this work today.",
      implementationCost:
        "Enigma does not invent project cost. Enter discovery, implementation, knowledge, change management, services, and other on the project.",
    },
  };
}

export function proposeCaseTiming(input: {
  confidence: CandidateConfidence | null;
  signals: Pick<CandidateSignalRef, "key" | "strength">[];
  constraintCount: number;
}): ProposedCaseTiming {
  const weakCount = input.signals.filter((signal) => signal.strength === "weak").length;
  const collision = strengthOf(input.signals, "automation_collision");
  const adoption =
    input.confidence === "high"
      ? { conservative: 0.1, expected: 0.18, aggressive: 0.3 }
      : input.confidence === "low"
        ? { conservative: 0.06, expected: 0.1, aggressive: 0.18 }
        : { conservative: 0.1, expected: 0.15, aggressive: 0.25 };

  const baselineDays =
    90 +
    weakCount * 30 +
    (collision === "strong" || collision === "mixed" ? 20 : 0) +
    Math.min(input.constraintCount, 4) * 15;
  const enigmaDays = Math.max(30, Math.round(baselineDays * 0.4));

  return {
    conservativeAdoption: adoption.conservative,
    expectedAdoption: adoption.expected,
    aggressiveAdoption: adoption.aggressive,
    baselineDays,
    enigmaDays,
    reasons: {
      adoption: `Deciphered from opportunity confidence (${input.confidence ?? "unknown"}). Adoption is the share of inferred volume the agent can take.`,
      baselineDays:
        "Deciphered from signal gaps, automation collision, and constraints — without Enigma.",
      enigmaDays:
        "Deciphered as the Enigma-assisted path through the same readiness gaps.",
    },
  };
}

export function assumptionSource(
  actual: number | null,
  proposed: number,
): "Enigma Assumption" | "Customer Provided" {
  return actual != null && actual === proposed
    ? "Enigma Assumption"
    : actual == null
      ? "Enigma Assumption"
      : "Customer Provided";
}

function strengthOf(
  signals: Pick<CandidateSignalRef, "key" | "strength">[],
  key: string,
) {
  return signals.find((signal) => signal.key === key)?.strength ?? null;
}

function strengthFactor(strength: string | null) {
  if (strength === "strong") {
    return 1;
  }
  if (strength === "mixed") {
    return 0.7;
  }
  return 0.45;
}

function niceVolume(value: number) {
  if (value >= 20000) {
    return Math.round(value / 1000) * 1000;
  }
  if (value >= 5000) {
    return Math.round(value / 500) * 500;
  }
  return Math.round(value / 100) * 100;
}
