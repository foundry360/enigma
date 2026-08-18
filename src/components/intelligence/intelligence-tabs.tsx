"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  Lightbulb,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { intelligenceHref, intelligenceTabs } from "@/lib/intelligence/routes";

const tabIcons = {
  overview: LayoutDashboard,
  opportunities: Lightbulb,
  "business-case": Briefcase,
  deployment: Rocket,
  outcomes: TrendingUp,
} as const;

export function IntelligenceTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const overviewHref = intelligenceHref(projectId);

  return (
    <nav
      className="flex flex-wrap gap-x-4 border-t border-border px-5 lg:px-6"
      aria-label="Intelligence"
    >
      {intelligenceTabs.map((tab) => {
        const href = intelligenceHref(projectId, tab.id);
        const Icon = tabIcons[tab.id];
        const active =
          tab.id === "overview"
            ? pathname === overviewHref
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.id}
            href={href}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-4 py-2.5 text-sm ${
              active
                ? "border-accent font-semibold text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
