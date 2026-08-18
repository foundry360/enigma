export { runAssessmentPass } from "@/modules/intelligence/run";
export {
  consumptionPosture,
  forecastConfidence,
} from "@/modules/intelligence/consumption";
export type { ConsumptionPosture, ForecastConfidence } from "@/modules/intelligence/consumption";
export {
  detectOpportunityCandidates,
  draftOpportunityCandidates,
  hydrateCandidateDrafts,
  opportunityCatalog,
  opportunityDefinition,
} from "@/modules/intelligence/opportunities";
export { normalizeSignals } from "@/modules/intelligence/signals";
export {
  overallFinding,
  overallScore,
  readinessRisk,
  scoreAssessment,
  signalState,
} from "@/modules/intelligence/score";
export type { ReadinessRisk } from "@/modules/intelligence/score";
export { compareOpportunitySnapshots } from "@/modules/intelligence/snapshots";
export type { SnapshotComparison, SnapshotItem } from "@/modules/intelligence/snapshots";
export {
  followUpToolPlan,
  initialToolPlan,
  objectCandidates,
} from "@/modules/intelligence/plan";
export type {
  AssessmentFacts,
  AssessmentRunResult,
  BusinessSignal,
  Evidence,
  Judgment,
  SignalContext,
} from "@/modules/intelligence/types";
