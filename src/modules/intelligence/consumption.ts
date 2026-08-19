import type { ReadinessRisk } from "@/modules/intelligence/score";

export type ForecastConfidence = ReadinessRisk;

export type ConsumptionPosture = {
  driver: string;
  confidence: ForecastConfidence;
  unitHint: string;
};

const postures: Record<
  string,
  { driver: string; unitHint: string }
> = {
  case_service_agent: {
    driver: "Service conversations and write-back",
    unitHint: "Volume is conversation turns and work updates, not seats.",
  },
  knowledge_assist: {
    driver: "Retrieval turns",
    unitHint: "Volume is grounded answers. Missing approved content makes the forecast dishonest.",
  },
  guided_case_flow: {
    driver: "Guided path conversations",
    unitHint: "Volume is assisted service paths. Dense automation will fight the agent.",
  },
};

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
  const known = postures[input.key] ?? {
    driver: "Agent conversations",
    unitHint: "Volume is usage, not licenses. A consumption price is optional.",
  };

  return {
    driver: known.driver,
    unitHint: known.unitHint,
    confidence: forecastConfidence(input.score),
  };
}
