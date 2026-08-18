export const projectTypes = [
  "AI Readiness",
  "AI Opportunity Assessment",
  "Agentforce",
  "Process Transformation",
  "AI / Agent Deployment",
  "Platform Optimization",
  "Custom",
] as const;

export const primaryOutcomes = [
  "Reduce operational cost",
  "Increase productivity",
  "Improve customer experience",
  "Increase revenue",
  "Automate manual processes",
  "Accelerate AI adoption",
  "Modernize operations",
  "Improve employee experience",
  "Other",
] as const;

export const projectStatuses = [
  "Planning",
  "Active",
  "On hold",
  "Complete",
] as const;

export const projectPriorities = ["High", "Medium", "Low"] as const;

export const scopePlatforms = [
  "SALESFORCE",
  "PEGA",
  "SERVICENOW",
  "MICROSOFT",
  "OTHER",
] as const;

export type ProjectType = (typeof projectTypes)[number];
export type PrimaryOutcome = (typeof primaryOutcomes)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectPriority = (typeof projectPriorities)[number];
export type ScopePlatform = (typeof scopePlatforms)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "Planning";

export const projectPhases = [
  "Connect",
  "Discover",
  "Assess",
  "Prioritize",
  "Model",
  "Recommend",
] as const;

export type ProjectPhase = (typeof projectPhases)[number];

export function projectProgress(input: {
  connected: boolean;
  assessmentStatus?: string | null;
}) {
  const status = input.assessmentStatus;
  const notStarted = !status || status === "DRAFT" || status === "FAILED";
  const completed = !input.connected
    ? 0
    : notStarted
      ? 1
      : status === "COMPLETE"
        ? 3
        : 2;
  const current = projectPhases[Math.min(completed, projectPhases.length - 1)];

  return {
    current,
    completed,
    total: projectPhases.length,
  };
}

export function playbookLabel(
  projectType: string,
  platformName?: string | null,
) {
  return platformName ? `${platformName} ${projectType}` : projectType;
}

export function asOutcomeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}
