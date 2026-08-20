import type { SignalStrength } from "@/modules/intelligence/types";

export function signalState(score: number): SignalStrength {
  if (score >= 75) {
    return "strong";
  }

  if (score >= 45) {
    return "mixed";
  }

  return "weak";
}

export function strengthFromSignal(signal: {
  strength: SignalStrength;
  score?: number;
}): SignalStrength {
  return typeof signal.score === "number"
    ? signalState(signal.score)
    : signal.strength;
}
