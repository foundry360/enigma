import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { SessionPayload } from "@/lib/auth/session";

const nav = [
  { href: "/dashboard", label: "Opportunity" },
  { href: "/accounts", label: "Accounts" },
  { href: "/assessments", label: "Assessments" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  session,
  tenantName,
  userName,
  children,
}: {
  session: SessionPayload;
  tenantName: string;
  userName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface px-5 py-6 md:flex md:flex-col">
        <Link href="/dashboard" className="font-serif text-2xl tracking-tight">
          Enigma
        </Link>
        <p className="mt-1 text-xs text-muted">Consumption value platform</p>
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-surface-2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="truncate text-sm">{userName}</p>
          <p className="truncate text-xs text-muted">{tenantName}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-accent">
            {session.role}
          </p>
          <form action={logout} className="mt-3">
            <button type="submit" className="text-xs text-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="border-b border-border px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-serif text-xl">
            Enigma
          </Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
