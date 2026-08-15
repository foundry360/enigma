import type { ReactNode } from "react";
import { Card, CardLabel } from "@/components/ui/card";

export function Metric({
  label,
  value,
  hint,
  estimate = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  estimate?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardLabel>{label}</CardLabel>
        {estimate ? <span className="text-[10px] uppercase tracking-wide text-muted">Estimate</span> : null}
      </div>
      <p className="mt-3 font-serif text-3xl tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </Card>
  );
}
