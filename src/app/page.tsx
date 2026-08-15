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
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(212,160,23,0.08),_transparent_32%),linear-gradient(#070b14,_#070b14)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-serif text-2xl">Enigma</p>
        <div className="flex gap-3 text-sm">
          {session ? (
            <Link href="/dashboard" className="text-accent">
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="text-accent">
                Create workspace
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          AI consumption value platform
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
          Where can Agentforce create measurable value in this environment?
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          Enigma turns a Salesforce org into a quantified Agentforce opportunity
          assessment: readiness, use cases, consumption, business value, and the
          next step — in minutes, not weeks.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={session ? "/dashboard" : "/signup"}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg"
          >
            {session ? "Continue assessment" : "Start an assessment workspace"}
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground"
          >
            Sign in
          </Link>
        </div>
        <ol className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflow.map((step, index) => (
            <li
              key={step}
              className="rounded-xl border border-border bg-surface px-4 py-4"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm">{step}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
