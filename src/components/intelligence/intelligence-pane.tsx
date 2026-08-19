import type { ReactNode } from "react";

export function IntelligencePane({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      className={
        scroll
          ? "absolute inset-0 min-h-0 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "absolute inset-0 flex min-h-0 flex-col overflow-hidden"
      }
    >
      {children}
    </div>
  );
}
