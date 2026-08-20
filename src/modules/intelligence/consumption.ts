import type { ReadinessRisk } from "@/modules/intelligence/score";

export type ForecastConfidence = ReadinessRisk;

export type ConsumptionPosture = {
  driver: string;
  confidence: ForecastConfidence;
  unitHint: string;
};

function postureForKey(key: string) {
  if (key.startsWith("work:")) {
    const label = key
      .slice(5)
      .replace(/__c$/i, "")
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
    return {
      driver: `${label} conversations and write-back`,
      unitHint: "Volume is conversation turns and work updates, not seats.",
    };
  }

  return {
    driver: "Agent conversations",
    unitHint: "Volume is usage, not licenses. A consumption price is optional.",
  };
}

export function forecastConfidence(score: number): ForecastConfidence {
  if (score >= 75) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

export function consumptionPosture(input: {
  key: string;
  score: number;
}): ConsumptionPosture {
  const known = postureForKey(input.key);

  return {
    driver: known.driver,
    unitHint: known.unitHint,
    confidence: forecastConfidence(input.score),
  };
}
