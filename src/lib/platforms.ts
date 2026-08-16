import {
  projectPlatforms,
  type ProjectPlatform,
} from "@/lib/db/types";

export { projectPlatforms, type ProjectPlatform };

export const platformLabels: Record<ProjectPlatform, string> = {
  SALESFORCE: "Salesforce",
  PEGA: "Pega",
  SERVICENOW: "ServiceNow",
};

export function isProjectPlatform(
  value: string | null | undefined,
): value is ProjectPlatform {
  return projectPlatforms.some((platform) => platform === value);
}

export function platformLabel(platform: string) {
  if (isProjectPlatform(platform)) {
    return platformLabels[platform];
  }
  if (platform === "MICROSOFT") {
    return "Microsoft";
  }
  return platform;
}
