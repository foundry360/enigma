import {
  readinessRisk,
  type ReadinessRisk,
} from "@/modules/intelligence/score";

export const riskColors: Record<ReadinessRisk, string> = {
  low: "#3ECF8E",
  medium: "#F5C542",
  high: "#F16A50",
};

const riskBadge: Record<ReadinessRisk, string> = {
  low: "border-transparent bg-[#3ECF8E] text-white",
  medium: "border-transparent bg-[#F5C542] text-[#2d3340]",
  high: "border-transparent bg-[#F16A50] text-white",
};

const riskLabel: Record<ReadinessRisk, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

export function RiskBadge({ risk }: { risk: ReadinessRisk | null }) {
  if (!risk) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${riskBadge[risk]}`}
    >
      {riskLabel[risk]}
    </span>
  );
}

const ringSize = {
  md: {
    box: "h-36 w-36",
    score: "text-3xl",
    unit: "mt-0.5 text-xs",
    label: "mt-1.5 max-w-[5.5rem] text-[0.65rem] leading-snug",
    stroke: "7",
  },
  lg: {
    box: "h-64 w-64",
    score: "text-5xl",
    unit: "mt-1 text-sm",
    label: "mt-2 max-w-[8rem] text-sm leading-snug",
    stroke: "7",
  },
} as const;

export function ScoreRing({
  score,
  label,
  size = "md",
  showBadge = true,
}: {
  score: number | null;
  label?: string;
  size?: keyof typeof ringSize;
  showBadge?: boolean;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const ring = ringSize[size];
  const risk = readinessRisk(score);
  const stroke = risk ? riskColors[risk] : "var(--border)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${ring.box}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={ring.stroke}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={ring.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className={`font-semibold tabular-nums leading-none ${ring.score}`}>
            {score === null ? "—" : score}
          </p>
          <p className={`text-muted ${ring.unit}`}>/100</p>
          {label ? (
            <p className={`text-muted ${ring.label}`}>{label}</p>
          ) : null}
        </div>
      </div>
      {showBadge && risk ? <RiskBadge risk={risk} /> : null}
    </div>
  );
}
