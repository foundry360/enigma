import type { ReactNode } from "react";

const tones = {
  neutral: "border-border text-muted",
  accent: "border-accent/30 text-accent",
  positive: "border-positive/30 text-positive",
  caution: "border-caution/30 text-caution",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
