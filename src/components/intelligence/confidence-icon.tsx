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
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
} as const;

export function ConfidenceIcon({
  confidence,
  className = "size-[22px]",
}: {
  confidence: CandidateConfidence;
  className?: string;
}) {
  const Icon = icons[confidence];

  return (
    <Icon
      className={`block shrink-0 ${className}`}
      style={{ color: colors[confidence] }}
      aria-label={labels[confidence]}
    />
  );
}
