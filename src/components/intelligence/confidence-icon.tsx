import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { strengthColors } from "@/components/ui/score-ring";
import type { CandidateConfidence } from "@/lib/db/types";

const icons = {
  high: SignalHigh,
  medium: SignalMedium,
  low: SignalLow,
} as const;

const colors = {
  high: strengthColors.strong,
  medium: strengthColors.mixed,
  low: strengthColors.weak,
} as const;

const labels = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
} as const;

export function ConfidenceIcon({
  confidence,
}: {
  confidence: CandidateConfidence;
}) {
  const Icon = icons[confidence];

  return (
    <Icon
      className="size-[22px] shrink-0"
      style={{ color: colors[confidence] }}
      aria-label={labels[confidence]}
    />
  );
}
