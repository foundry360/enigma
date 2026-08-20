import type { ReactNode } from "react";

const tones = {
  neutral: "border-border bg-surface-2 font-medium text-muted",
  accent: "border-accent bg-accent font-medium text-accent-fg",
  connected: "border-transparent bg-connected font-medium text-[#2d3340]",
  high: "border-transparent bg-[#3ECF8E] font-medium text-[#2d3340]",
  medium: "border-transparent bg-[#F5C542] font-medium text-[#2d3340]",
  low: "border-transparent bg-[#F16A50] font-medium text-white",
  strong: "border-transparent bg-[#3ECF8E] font-medium text-[#2d3340]",
  mixed: "border-transparent bg-[#F5C542] font-medium text-[#2d3340]",
  weak: "border-transparent bg-[#F16A50] font-medium text-white",
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
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
