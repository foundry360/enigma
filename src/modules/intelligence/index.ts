export { runAssessmentPass } from "@/modules/intelligence/run";
export {
  intelligenceRunStages,
  progressForStage,
} from "@/modules/intelligence/run-progress";
export {
  consumptionPosture,
  forecastConfidence,
} from "@/modules/intelligence/consumption";
export type { ConsumptionPosture, ForecastConfidence } from "@/modules/intelligence/consumption";
export {
  detectOpportunityCandidates,
  draftOpportunityCandidates,
  hydrateCandidateDrafts,
  opportunityDefinition,
  opportunityKey,
} from "@/modules/intelligence/opportunities";
export {
  parseOpportunityFits,
  resolveOpportunityFits,
  groundOpportunityFits,
} from "@/modules/intelligence/opportunity-fits";
export {
  expandEvidenceCitations,
  summarizeEvidenceLayers,
} from "@/modules/intelligence/evidence-expand";
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
  describeObjectPlan,
  followUpContextPlan,
  followUpMapPlan,
  followUpToolPlan,
  initialToolPlan,
} from "@/modules/intelligence/plan";
export {
  attachOpportunityName,
  buildOrgIntelligence,
  formatOrgIntelligenceBrief,
  hydrateOrgIntelligence,
  stampOrgIntelligenceRun,
  workFitPoolFromIntelligence,
} from "@/modules/intelligence/org-intelligence";
export type { OrgIntelligence } from "@/modules/intelligence/org-model";
export { factsFromTraces } from "@/modules/intelligence/summarize";
export type {
  AssessmentFacts,
  AssessmentRunResult,
  BusinessSignal,
  Evidence,
  Judgment,
  SignalContext,
} from "@/modules/intelligence/types";
