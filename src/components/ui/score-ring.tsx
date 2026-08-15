export function ScoreRing({
  score,
  label = "Readiness",
}: {
  score: number | null;
  label?: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
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
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <p className="mt-1 font-serif text-4xl tracking-tight">
          {score === null ? "—" : score}
          <span className="text-lg text-muted">/100</span>
        </p>
      </div>
    </div>
  );
}
