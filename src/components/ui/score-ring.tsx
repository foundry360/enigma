export function ScoreRing({
  score,
  label = "Readiness",
}: {
  score: number | null;
  label?: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-16 w-16 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
          {score === null ? "—" : score}
          <span className="text-sm font-normal text-muted">/100</span>
        </p>
      </div>
    </div>
  );
}
