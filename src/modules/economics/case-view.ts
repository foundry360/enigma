import type {
  BusinessCaseLineRow,
  BusinessCaseRow,
  CandidateConfidence,
  CandidateSignalRef,
} from "@/lib/db/types";
import type { CaseRollup, RecommendationState } from "@/modules/economics/model";
import type { ProposedCaseTiming, ProposedLine } from "@/modules/economics/propose";

export type BusinessCaseLineView = BusinessCaseLineRow & {
  opportunityName: string;
  businessArea: string;
  businessProcess: string;
  recommendedCapability: string;
  candidateKey: string;
  unitHint: string;
  confidence: CandidateConfidence;
  finding: string;
  supportingSignals: CandidateSignalRef[];
  evidence: { tool: string; citation: string; expansion?: string }[];
  consumptionDrivers: string[];
  valueDrivers: string[];
  constraints: string[];
  dependencies: string[];
  proposed: ProposedLine;
};

export type BusinessCaseDetail = {
  businessCase: BusinessCaseRow;
  lines: BusinessCaseLineView[];
  rollup: CaseRollup;
  gaps: string[];
  recommendationState: RecommendationState;
  proposedCase: ProposedCaseTiming;
};
