import "server-only";

import { z } from "zod";
import {
  describeSalesforceObject,
  fetchSalesforceIdentity,
  getSalesforceAgentforceConfiguration,
  getSalesforceIntegrationMap,
  getSalesforceKnowledgePosture,
  getSalesforceOrgLimits,
  getSalesforceSecuritySummary,
  instanceKind,
  listSalesforceAutomations,
  listSalesforceObjects,
  listSalesforceProcessControls,
  listSalesforceValidationRules,
  mapSalesforceOrgProfile,
  withSalesforceAccess,
} from "@/modules/connectors/salesforce";
import { isMcpToolName, type McpToolName } from "@/modules/mcp/catalog";
import { requireTenantId } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";
import {
  getConnectionRefreshToken,
  getPublicConnection,
  persistConnectionOrgProfile,
  persistConnectionRefreshToken,
} from "@/server/services/connections";

const scopeSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
  connectionId: z.string().min(1),
  userId: z.string().min(1).optional(),
});

const describeSchema = scopeSchema.extend({
  apiName: z.string().min(1),
});

export type McpCall = {
  tenantId: string;
  organizationId: string;
  connectionId: string;
  userId?: string;
  tool: string;
  apiName?: string;
  accessToken?: string;
};

export type McpResult =
  | { ok: true; tool: McpToolName; data: unknown }
  | { ok: false; tool: string; error: string };

async function deny(input: McpCall, error: string): Promise<McpResult> {
  if (input.tenantId) {
    await writeAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "mcp.deny",
      entity: "PlatformConnection",
      entityId: input.connectionId,
      metadata: {
        tool: input.tool,
        organizationId: input.organizationId,
        error,
      },
    });
  }

  return { ok: false, tool: input.tool, error };
}

export async function callMcpTool(input: McpCall): Promise<McpResult> {
  const scoped = scopeSchema.safeParse(input);

  if (!scoped.success) {
    return deny(input, "MCP calls require tenant, organization, and connection.");
  }

  requireTenantId(scoped.data.tenantId);

  if (!isMcpToolName(input.tool)) {
    return deny(input, "Unknown MCP tool.");
  }

  const connection = await getPublicConnection(
    scoped.data.tenantId,
    scoped.data.connectionId,
  );

  if (
    !connection ||
    connection.organizationId !== scoped.data.organizationId
  ) {
    return deny(input, "Connection not found for this organization.");
  }

  if (input.tool === "get_connection") {
    let org = connection.orgProfile ?? null;
    if (input.accessToken && connection.instanceUrl) {
      try {
        const identity = await fetchSalesforceIdentity({
          instanceUrl: connection.instanceUrl,
          accessToken: input.accessToken,
        });
        org = mapSalesforceOrgProfile(identity, connection.instanceUrl);
        await persistConnectionOrgProfile(
          scoped.data.tenantId,
          connection.id,
          org,
        );
      } catch {
        org = connection.orgProfile ?? null;
      }
    }

    await writeAuditLog({
      tenantId: scoped.data.tenantId,
      userId: input.userId,
      action: "mcp.call",
      entity: "PlatformConnection",
      entityId: connection.id,
      metadata: {
        tool: input.tool,
        organizationId: connection.organizationId,
      },
    });

    return {
      ok: true,
      tool: input.tool,
      data: {
        connectionId: connection.id,
        organizationId: connection.organizationId,
        platformType: connection.platformType,
        status: connection.status,
        externalOrgId: org?.orgId ?? connection.externalOrgId,
        externalOrgName: org?.name ?? connection.externalOrgName,
        instanceKind: org?.instanceKind ?? instanceKind(connection.instanceUrl),
        org,
      },
    };
  }

  if (connection.status !== "CONNECTED" || !connection.instanceUrl) {
    return deny(input, "Salesforce is not connected.");
  }

  const refreshToken = await getConnectionRefreshToken(
    scoped.data.tenantId,
    connection.id,
  );

  if (!refreshToken) {
    return deny(input, "Salesforce credentials are missing.");
  }

  const describe =
    input.tool === "describe_object"
      ? describeSchema.safeParse({ ...scoped.data, apiName: input.apiName })
      : null;

  if (input.tool === "describe_object" && describe?.success !== true) {
    return deny(input, "describe_object requires an object API name.");
  }

  const objectApiName =
    describe?.success === true ? describe.data.apiName : undefined;

  const runTool = async (accessToken: string) => {
    const live = {
      instanceUrl: connection.instanceUrl as string,
      accessToken,
    };

    switch (input.tool) {
      case "list_objects":
        return listSalesforceObjects(live);
      case "describe_object":
        return describeSalesforceObject({
          ...live,
          apiName: objectApiName ?? "",
        });
      case "list_automations":
        return listSalesforceAutomations(live);
      case "list_validation_rules":
        return listSalesforceValidationRules(live);
      case "list_process_controls":
        return listSalesforceProcessControls(live);
      case "security_summary":
        return getSalesforceSecuritySummary(live);
      case "knowledge_posture":
        return getSalesforceKnowledgePosture(live);
      case "org_limits":
        return getSalesforceOrgLimits(live);
      case "get_integration_map":
        return getSalesforceIntegrationMap(live);
      case "get_agentforce_configuration":
        return getSalesforceAgentforceConfiguration(live);
      default:
        throw new Error("Unknown MCP tool.");
    }
  };

  try {
    const data = input.accessToken
      ? await runTool(input.accessToken)
      : await withSalesforceAccess({
          instanceUrl: connection.instanceUrl,
          refreshToken,
          onRotatedRefreshToken: (nextToken) =>
            persistConnectionRefreshToken(
              scoped.data.tenantId,
              connection.id,
              nextToken,
            ),
          run: runTool,
        });

    await writeAuditLog({
      tenantId: scoped.data.tenantId,
      userId: input.userId,
      action: "mcp.call",
      entity: "PlatformConnection",
      entityId: connection.id,
      metadata: {
        tool: input.tool,
        organizationId: connection.organizationId,
        apiName: input.apiName ?? null,
      },
    });

    return { ok: true, tool: input.tool, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Salesforce metadata request failed.";
    return deny(input, message);
  }
}

export { mcpTools, isMcpToolName } from "@/modules/mcp/catalog";
