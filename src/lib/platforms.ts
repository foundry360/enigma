import {
  projectPlatforms,
  type ProjectPlatform,
} from "@/lib/db/types";

export { projectPlatforms, type ProjectPlatform };

export const platformLabels: Record<string, string> = {
  SALESFORCE: "Salesforce",
  PEGA: "Pega",
  SERVICENOW: "ServiceNow",
  MICROSOFT: "Microsoft",
  OTHER: "Other",
};

export function isProjectPlatform(
  value: string | null | undefined,
): value is ProjectPlatform {
  return projectPlatforms.some((platform) => platform === value);
}

export function platformLabel(platform: string | null | undefined) {
  if (!platform) {
    return "No platform in scope";
  }
  return platformLabels[platform] ?? platform;
}
