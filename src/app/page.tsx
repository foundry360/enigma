import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const workflow = [
  "Connect Salesforce",
  "Discover the environment",
  "Assess Agentforce readiness",
  "Identify opportunities",
  "Model consumption and value",
  "Recommend the next move",
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-full">
      <header className="flex h-12 items-center justify-between border-b border-border px-4">
        <p className="text-sm font-semibold">Enigma</p>
        <div className="flex items-center gap-3 text-sm">
          {session ? (
            <Link href="/accounts" className="text-accent">
              Open partner org
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="text-accent">
                Create partner org
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Agentforce opportunity assessment
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Quantify readiness, use cases, consumption, and value from a
          Salesforce org — then decide the next move.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={session ? "/accounts" : "/signup"}
            className="inline-flex h-8 items-center rounded-md bg-accent px-2.5 text-sm font-medium text-accent-fg"
          >
            {session ? "Continue" : "Create partner org"}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-sm"
          >
            Sign in
          </Link>
        </div>
        <ol className="mt-8 divide-y divide-border rounded-md border border-border bg-surface">
          {workflow.map((step, index) => (
            <li key={step} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-6 font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
