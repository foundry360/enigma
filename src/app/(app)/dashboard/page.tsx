import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceSummary, listAccounts } from "@/server/services/accounts";

const workflow = [
  { step: "01", title: "Connect Salesforce", status: "Sprint 2" },
  { step: "02", title: "Discover metadata", status: "Sprint 2" },
  { step: "03", title: "Score readiness", status: "Sprint 3" },
  { step: "04", title: "Detect opportunities", status: "Sprint 3" },
  { step: "05", title: "Model consumption and value", status: "Sprint 4" },
  { step: "06", title: "Roadmap and executive brief", status: "Sprint 5" },
];

export default async function DashboardPage() {
  const session = await requireSession();
  const [summary, accounts] = await Promise.all([
    getWorkspaceSummary(session.tenantId),
    listAccounts(session.tenantId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="AE dashboard"
        title="Agentforce opportunity"
        description="The assessment shape is in place. Connect a Salesforce org next to replace placeholders with evidence-backed scores."
        actions={
          <Link href="/accounts/new" className={buttonClassName()}>
            Add account
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <CardLabel>Primary account view</CardLabel>
            <h2 className="mt-3 font-serif text-2xl">
              {accounts[0]?.name ?? "No customer account yet"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {accounts[0]
                ? "Salesforce connection and assessment engines arrive in later sprints."
                : "Add the customer you want to assess, then connect Salesforce."}
            </p>
          </div>
          <div className="mt-8">
            <ScoreRing score={null} />
            <p className="mt-3 text-xs text-muted">
              Scores stay empty until they can be explained with evidence.
            </p>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Estimated annual value" value="—" estimate />
          <Metric label="Estimated annual consumption" value="—" estimate />
          <Metric
            label="Return on Consumption"
            value="—"
            hint="Enigma metric: value / AI consumption cost"
            estimate
          />
          <Metric label="Estimated payback" value="—" estimate />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Metric label="Accounts" value={summary.accountCount} />
        <Metric label="Assessments" value={summary.assessmentCount} />
        <Metric label="Platform connections" value={summary.connectionCount} />
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <CardLabel>Recommended next step</CardLabel>
          <Badge tone="accent">Foundation complete</Badge>
        </div>
        <h2 className="mt-3 font-serif text-2xl">Add a customer account</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Sprint 2 will attach Salesforce OAuth to that account. Do not treat
          empty economics as official Salesforce pricing — those models are
          configurable and labeled as estimates.
        </p>
      </Card>

      <ol className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {workflow.map((item) => (
          <li key={item.step} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                {item.step}
              </p>
              <Badge>{item.status}</Badge>
            </div>
            <p className="mt-3 text-sm">{item.title}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
