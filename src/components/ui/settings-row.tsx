import type { ReactNode } from "react";

export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 px-4 py-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
