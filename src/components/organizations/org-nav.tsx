"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OrganizationNav({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const base = `/accounts/${organizationId}`;
  const items = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/platforms`, label: "Platforms" },
    { href: `${base}/environments`, label: "Environments" },
    { href: `${base}/projects`, label: "Projects" },
    { href: `${base}/assessments`, label: "Runs" },
    { href: `${base}/activity`, label: "Activity" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-2.5 py-2 text-sm ${
              active
                ? "border-b-2 border-accent text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
