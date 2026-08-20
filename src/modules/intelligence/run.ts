import "server-only";

import { withSalesforceAccess } from "@/modules/connectors/salesforce";
import { callMcpTool } from "@/modules/mcp";
import type { McpToolName } from "@/modules/mcp/catalog";
import {
  describeObjectPlan,
  followUpContextPlan,
  followUpMapPlan,
  initialToolPlan,
} from "@/modules/intelligence/plan";
import {
  fallbackOpportunityFits,
  groundOpportunityFits,
  opportunityReasonPrompt,
  parseOpportunityFits,
  stampOpportunityFits,
} from "@/modules/intelligence/opportunity-fits";
import { objectsReferencedByMetadata } from "@/modules/intelligence/work-objects";
import {
  attachOpportunityName,
  buildOrgIntelligence,
  workFitPoolFromIntelligence,
} from "@/modules/intelligence/org-intelligence";
import { normalizeSignals } from "@/modules/intelligence/signals";
import { overallScore, scoreAssessment } from "@/modules/intelligence/score";
import { factsFromResults, summarizeToolResult } from "@/modules/intelligence/summarize";
import { completeReasoningChat } from "@/server/services/inference";
import type { AssessmentRunResult, ToolCall } from "@/modules/intelligence/types";
import type { IntelligenceRunStageId } from "@/modules/intelligence/run-progress";
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
  onStage?: (stage: IntelligenceRunStageId) => Promise<void> | void;
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

  await input.onStage?.("connect");

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
  await input.onStage?.("map");
  const maps = await callTools(scope, followUpMapPlan(), accessToken);
  const factsAfterMaps = factsFromResults(input, [...first, ...maps]);
  const describes = await callTools(
    scope,
    describeObjectPlan({
      projectType: input.projectType,
      objective: input.objective,
      outcomes: input.outcomes,
      objects: factsAfterMaps.objects,
      referencedNames: objectsReferencedByMetadata(factsAfterMaps),
    }),
    accessToken,
  );
  await input.onStage?.("context");
  const contextTools = await callTools(
    scope,
    followUpContextPlan(),
    accessToken,
  );
  const results = [...first, ...maps, ...describes, ...contextTools];
  const facts = factsFromResults(input, results);
  await input.onStage?.("model");
  const orgIntelligence = buildOrgIntelligence(facts);
  const context = normalizeSignals(facts, orgIntelligence);
  const pool = workFitPoolFromIntelligence(orgIntelligence, facts).filter(
    (item) => item.role !== "context",
  );
  await input.onStage?.("fit");
  const fits = await reasonOpportunityFits(input, pool, context, orgIntelligence);
  const judgments = scoreAssessment(facts, fits, context);

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
    orgIntelligence: attachOpportunityName(
      orgIntelligence,
      judgments.find((item) => item.kind === "opportunity")?.title ?? null,
    ),
  };
}

async function reasonOpportunityFits(
  input: {
    projectType: string;
    objective: string;
    outcomes: string[];
  },
  pool: ReturnType<typeof workFitPoolFromIntelligence>,
  context: ReturnType<typeof normalizeSignals>,
  orgIntelligence: ReturnType<typeof buildOrgIntelligence>,
) {
  if (pool.length === 0) {
    return groundOpportunityFits(
      fallbackOpportunityFits(pool),
      orgIntelligence,
      context.signals,
    );
  }

  const prompt = opportunityReasonPrompt({
    projectType: input.projectType,
    objective: input.objective,
    outcomes: input.outcomes,
    work: pool,
    signals: context.signals.map((signal) => ({
      key: signal.key,
      title: signal.title,
      strength: signal.strength,
      score: signal.score,
      meaning: signal.meaning,
    })),
    orgSummary: orgIntelligence.summary,
    findings: orgIntelligence.findings.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      domain: item.domain,
      provenance: item.provenance,
      confidence: item.confidence,
    })),
    gaps: (orgIntelligence.gaps ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      impact: item.impact,
    })),
  });
  const completion = await completeReasoningChat({
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxTokens: 1400,
    timeoutMs: 45_000,
  });

  if (!completion) {
    return stampOpportunityFits(
      groundOpportunityFits(
        fallbackOpportunityFits(pool),
        orgIntelligence,
        context.signals,
      ),
      "metadata rank",
    );
  }

  const parsed = parseOpportunityFits(completion.text, pool);
  if (parsed.some((item) => item.selected)) {
    return stampOpportunityFits(
      groundOpportunityFits(parsed, orgIntelligence, context.signals),
      completion.model,
    );
  }

  return stampOpportunityFits(
    groundOpportunityFits(
      fallbackOpportunityFits(pool),
      orgIntelligence,
      context.signals,
    ),
    `${completion.model} (no usable fits; metadata rank)`,
  );
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
