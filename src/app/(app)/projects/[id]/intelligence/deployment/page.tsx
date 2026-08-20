import { notFound } from "next/navigation";
import { DeploymentPanel } from "@/components/intelligence/deployment-panel";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { requireSession } from "@/lib/auth/session";
import { platformLabel } from "@/lib/platforms";
import {
  isRecommendationState,
  recommendationLabel,
  sumProjectInvestment,
} from "@/modules/economics/model";
import { fillStorySlots, storyValues } from "@/modules/economics/story-slots";
import {
  caseAdoption,
  ensureBusinessCase,
} from "@/server/services/business-case";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceDeploymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const detail = await ensureBusinessCase(session.tenantId, id);
  const approved = detail?.businessCase.status === "approved";
  const state = detail?.recommendationState;
  const storedRecommendation = detail?.businessCase.recommendationNarrative;
  const recommendation = storedRecommendation
    ? fillStorySlots(
        storedRecommendation,
        storyValues({
          volume:
            detail?.lines.reduce(
              (sum, line) => sum + (line.annualVolume ?? 0),
              0,
            ) || null,
          share: detail ? caseAdoption(detail.businessCase) : null,
          impacted: detail?.rollup.impacted ?? null,
          hours: detail?.lines[0]?.hoursSavedPerUnit ?? null,
          labor: detail?.lines[0]?.hourlyCost ?? null,
          value: detail?.rollup.value ?? null,
          workItemCost: detail?.lines[0]?.unitPrice ?? null,
          consumption: detail?.rollup.consumption ?? null,
          net: detail?.rollup.netAnnual ?? null,
          roc: detail?.rollup.roc ?? null,
          state:
            state && isRecommendationState(state)
              ? state
              : "do_not_proceed",
        }),
      )
    : state && isRecommendationState(state)
      ? recommendationLabel[state]
      : "Save the business case to shape this path.";

  return (
    <IntelligencePane scroll>
      <DeploymentPanel
        projectId={id}
        approved={Boolean(approved)}
        canApprove={Boolean(detail?.rollup.complete)}
        platforms={overview.platforms.map((platform) =>
          platformLabel(platform.platformType),
        )}
        baselineDays={
          detail?.businessCase.baselineDays ??
          overview.project.baselineDays ??
          null
        }
        enigmaDays={
          detail?.businessCase.enigmaDays ?? overview.project.enigmaDays ?? null
        }
        recommendation={recommendation}
        gaps={detail?.gaps ?? []}
        impacted={detail?.rollup.impacted ?? null}
        consumption={detail?.rollup.consumption ?? null}
        value={detail?.rollup.value ?? null}
        investment={sumProjectInvestment({
          discovery: overview.project.discoveryCost,
          implementation: overview.project.implementationCost,
          knowledge: overview.project.knowledgeCost,
          change: overview.project.changeManagementCost,
          services: overview.project.servicesCost,
          other: overview.project.otherCost,
        })}
        streams={(detail?.lines ?? []).map((line) => ({
          name: line.opportunityName,
          description: line.finding,
          branches: [
            {
              heading: "What Must Be In Place",
              items: line.dependencies,
            },
            {
              heading: "Watch Outs",
              items: line.constraints,
            },
            {
              heading: "How Consumption Shows Up",
              items: line.consumptionDrivers,
            },
            {
              heading: "Where Value Comes From",
              items: line.valueDrivers,
            },
          ]
            .map((branch) => ({
              ...branch,
              items: branch.items.filter(Boolean),
            }))
            .filter((branch) => branch.items.length > 0),
        }))}
      />
    </IntelligencePane>
  );
}
