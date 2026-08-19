import type { ReactNode } from "react";

export function ProjectSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="border-t border-border pt-4 first:border-t-0 first:pt-0"
    >
      <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
        {title}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
