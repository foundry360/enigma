import { cache } from "react";
import { platformLabel } from "@/lib/platforms";
import { requireTenantId } from "@/lib/tenants/scope";
import {
  getAccount,
  listAssessments,
  listConnections,
} from "@/server/services/accounts";
import { listOrganizationActivity } from "@/server/services/audit";
import { listProjects } from "@/server/services/projects";

const activityLabels: Record<string, string> = {
  "organization.create": "Organization created",
  "organization.update": "Organization updated",
  "organization.disable": "Organization disabled",
  "organization.enable": "Organization enabled",
  "organization.delete": "Organization deleted",
  "project.create": "New transformation project created",
};

export const getOrganizationOverview = cache(async function getOrganizationOverview(
  tenantId: string,
  organizationId: string,
) {
  requireTenantId(tenantId);
  const [organization, connections, projects, assessments, activity] =
    await Promise.all([
      getAccount(tenantId, organizationId),
      listConnections(tenantId, organizationId),
      listProjects(tenantId, organizationId),
      listAssessments(tenantId, organizationId),
      listOrganizationActivity(tenantId, organizationId),
    ]);

  if (!organization) {
    return null;
  }

  const platforms = new Map<
    string,
    { platformType: string; environments: number; connected: number; lastSync: Date | null }
  >();

  for (const connection of connections) {
    const current = platforms.get(connection.platformType) ?? {
      platformType: connection.platformType,
      environments: 0,
      connected: 0,
      lastSync: null,
    };
    current.environments += 1;
    if (connection.status === "CONNECTED") {
      current.connected += 1;
    }
    const sync = connection.connectedAt ?? connection.updatedAt;
    if (!current.lastSync || new Date(sync) > new Date(current.lastSync)) {
      current.lastSync = sync;
    }
    platforms.set(connection.platformType, current);
  }

  for (const project of projects) {
    if (!project.platformType || platforms.has(project.platformType)) {
      continue;
    }
    platforms.set(project.platformType, {
      platformType: project.platformType,
      environments: 0,
      connected: 0,
      lastSync: null,
    });
  }

  const landscape = [...platforms.values()].map((platform) => ({
    ...platform,
    name: platformLabel(platform.platformType),
    status:
      platform.connected > 0
        ? "Connected"
        : platform.environments > 0
          ? "Disconnected"
          : "No environments",
  }));

  const completedAssessments = assessments.filter(
    (assessment) => assessment.status === "COMPLETE",
  ).length;
  const activeAssessments = assessments.filter((assessment) =>
    ["DRAFT", "DISCOVERING", "ANALYZING"].includes(assessment.status),
  ).length;

  const lastDates = [
    organization.updatedAt,
    ...connections.map((connection) => connection.updatedAt),
    ...projects.map((project) => project.updatedAt),
    ...assessments.map((assessment) => assessment.updatedAt),
    ...activity.map((event) => event.createdAt),
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime());

  const uniquePlatforms = landscape.length;
  const technologyComplexity =
    uniquePlatforms === 0
      ? null
      : uniquePlatforms === 1
        ? "Focused"
        : uniquePlatforms <= 3
          ? "Moderate"
          : "Broad";

  return {
    organization,
    connections,
    projects,
    assessments,
    landscape,
    environmentCount: connections.length,
    lastActivityAt: lastDates.length ? new Date(Math.max(...lastDates)) : null,
    assessmentSummary: {
      total: assessments.length,
      completed: completedAssessments,
      active: activeAssessments,
    },
    intelligence: {
      technologyComplexity,
      coverage: null,
      initiatives: projects.length,
      platformsAssessed: null,
    },
    activity: activity.map((event) => ({
      id: event.id,
      at: event.createdAt,
      label:
        activityLabels[event.action] ??
        `${event.entity} ${event.action.split(".").at(-1) ?? event.action}`,
    })),
  };
});
