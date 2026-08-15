import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-serif text-3xl tracking-tight">
          Enigma
        </Link>
        <p className="mt-2 text-sm text-muted">
          Quantify Agentforce value before you sell or deploy it.
        </p>
        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
