import type { ReactNode } from "react";

const tones = {
  neutral: "border-border bg-surface-2 text-muted",
  accent: "border-accent bg-accent text-accent-fg",
  connected: "border-transparent bg-connected text-white",
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
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
