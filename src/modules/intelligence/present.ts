import { consumptionPosture } from "@/modules/intelligence/consumption";
import { opportunityDefinition } from "@/modules/intelligence/opportunities";
import { compareOpportunitySnapshots } from "@/modules/intelligence/snapshots";

export function presentOpportunities(
  current: {
    id: string;
    key: string;
    title: string;
    score: number;
    evidence: { citation: string }[];
    reason: string;
    risk: string;
    recommendation: string;
  }[],
  previous: { key: string; title: string; score: number }[] | null,
) {
  const ranked = compareOpportunitySnapshots(
    current.map((item) => ({
      key: item.key,
      title: item.title,
      score: item.score,
    })),
    previous,
  );

  return ranked.flatMap((item) => {
    const judgment = current.find((entry) => entry.key === item.key);
    if (!judgment) {
      return [];
    }

    const posture = consumptionPosture({
      key: item.key,
      score: item.score,
    });
    const definition = opportunityDefinition(item.key);

    return [
      {
        id: judgment.id,
        key: judgment.key,
        title: judgment.title,
        score: item.score,
        delta: item.delta,
        driver: posture.driver,
        unitHint: posture.unitHint,
        confidence: posture.confidence,
        process: definition?.process ?? "Agent workflow",
        supportingSignals: definition?.requiredSignals ?? [],
        consumptionDrivers: definition?.consumptionDrivers ?? [posture.driver],
        valueDrivers: definition?.valueDrivers ?? [],
        evidence: judgment.evidence,
        reason: judgment.reason,
        risk: judgment.risk,
        recommendation: judgment.recommendation,
      },
    ];
  });
}
