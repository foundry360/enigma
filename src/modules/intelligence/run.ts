import "server-only";

import { withSalesforceAccess } from "@/modules/connectors/salesforce";
import { callMcpTool } from "@/modules/mcp";
import type { McpToolName } from "@/modules/mcp/catalog";
import {
  followUpToolPlan,
  initialToolPlan,
} from "@/modules/intelligence/plan";
import { buildOrgIntelligence } from "@/modules/intelligence/org-intelligence";
import { detectOpportunityCandidates } from "@/modules/intelligence/opportunities";
import { normalizeSignals } from "@/modules/intelligence/signals";
import { overallScore, scoreAssessment } from "@/modules/intelligence/score";
import { factsFromResults, summarizeToolResult } from "@/modules/intelligence/summarize";
import type { AssessmentRunResult, ToolCall } from "@/modules/intelligence/types";
import {
  getConnectionRefreshToken,
  getPublicConnection,
  persistConnectionRefreshToken,
} from "@/server/services/connections";

export async function runAssessmentPass(input: {
  tenantId: string;
  organizationId: string;
  connectionId: string;
  userId?: string;
  projectType: string;
  objective: string;
  outcomes: string[];
}): Promise<AssessmentRunResult> {
  const scope = {
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    connectionId: input.connectionId,
    userId: input.userId,
  };

  const connection = await getPublicConnection(
    input.tenantId,
    input.connectionId,
  );
  const refreshToken = connection?.instanceUrl
    ? await getConnectionRefreshToken(input.tenantId, input.connectionId)
    : null;

  if (!connection?.instanceUrl || !refreshToken) {
    throw new Error("Salesforce is not connected.");
  }

  const accessToken = await withSalesforceAccess({
    instanceUrl: connection.instanceUrl,
    refreshToken,
    onRotatedRefreshToken: (nextToken) =>
      persistConnectionRefreshToken(
        input.tenantId,
        input.connectionId,
        nextToken,
      ),
    run: async (token) => token,
  });

  const first = await callTools(scope, initialToolPlan(), accessToken);
  const factsAfterInventory = factsFromResults(input, first);
  const followUp = followUpToolPlan({
    projectType: input.projectType,
    objective: input.objective,
    outcomes: input.outcomes,
    objects: factsAfterInventory.objects,
  });
  const second = await callTools(scope, followUp, accessToken);
  const results = [...first, ...second];
  const facts = factsFromResults(input, results);
  const judgments = scoreAssessment(facts);
  const opportunity = detectOpportunityCandidates(normalizeSignals(facts))[0];

  return {
    facts,
    traces: results.map((result) => ({
      tool: result.tool,
      apiName: result.apiName,
      ok: result.ok,
      summary: result.ok
        ? summarizeToolResult(result.tool, result.data, result.apiName)
        : { error: result.error },
    })),
    judgments,
    overallScore: overallScore(judgments),
    orgIntelligence: buildOrgIntelligence(facts, {
      opportunityName: opportunity?.title ?? null,
    }),
  };
}

async function callTools(
  scope: {
    tenantId: string;
    organizationId: string;
    connectionId: string;
    userId?: string;
  },
  plan: ToolCall[],
  accessToken: string,
) {
  const results: {
    tool: McpToolName;
    apiName?: string;
    ok: boolean;
    data: unknown;
    error?: string;
  }[] = [];

  for (const call of plan) {
    const result = await callMcpTool({
      ...scope,
      tool: call.tool,
      apiName: call.apiName,
      accessToken,
    });

    results.push({
      tool: call.tool,
      apiName: call.apiName,
      ok: result.ok,
      data: result.ok ? result.data : null,
      error: result.ok ? undefined : result.error,
    });
  }

  return results;
}
