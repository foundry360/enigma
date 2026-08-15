export type PlatformKind = "SALESFORCE" | "PEGA" | "SERVICENOW" | "MICROSOFT";

export type NormalizedObject = {
  id: string;
  name: string;
  label: string;
  kind: "standard" | "custom";
  sourcePlatform: PlatformKind;
  sourceIdentifier: string;
};

export type NormalizedAutomation = {
  id: string;
  name: string;
  kind: "flow" | "code" | "rule" | "workflow";
  sourcePlatform: PlatformKind;
  sourceIdentifier: string;
};

export type NormalizedKnowledgeSource = {
  id: string;
  name: string;
  kind: "article" | "category" | "external";
  sourcePlatform: PlatformKind;
  sourceIdentifier: string;
};

export type ReadinessDimensionKey =
  | "data"
  | "process"
  | "knowledge"
  | "automation"
  | "security"
  | "governance";

export type ExplainableScore = {
  score: number;
  evidence: string[];
  reason: string;
  risk: string;
  recommendation: string;
};
