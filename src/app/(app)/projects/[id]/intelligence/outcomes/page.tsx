import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/format";
import { baselineFromSnapshot } from "@/modules/economics/forecast";
import { getBusinessCaseDetail } from "@/server/services/business-case";

export default async function IntelligenceOutcomesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const detail = await getBusinessCaseDetail(session.tenantId, id);
  const baseline = baselineFromSnapshot(
    detail?.businessCase.predictedSnapshot ?? null,
  );

  return (
    <IntelligencePane scroll>
      {baseline ? (
        <Card>
          <h2 className="text-lg font-semibold">Forecast Baseline</h2>
          <p className="mt-1 text-sm text-muted">
            This is the approved deployment forecast. Actuals will compare here
            when outcome tracking exists.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Item
              label="Work Per Year"
              value={
                baseline.workPerYear != null
                  ? new Intl.NumberFormat("en-US").format(baseline.workPerYear)
                  : "not set"
              }
            />
            <Item
              label="Agent Share"
              value={
                baseline.agentShare != null
                  ? formatPercent(baseline.agentShare)
                  : "not set"
              }
            />
            <Item
              label="Impacted Work"
              value={
                baseline.impactedWork != null
                  ? new Intl.NumberFormat("en-US").format(baseline.impactedWork)
                  : "not set"
              }
            />
            <Item
              label="Work Item Cost"
              value={
                baseline.workItemCost != null
                  ? formatCurrencyPrecise(baseline.workItemCost)
                  : "not set"
              }
            />
            <Item label="Consumption" value={money(baseline.consumption)} />
            <Item label="Annual Value" value={money(baseline.annualValue)} />
            <Item label="Net Annual" value={money(baseline.netAnnual)} />
            <Item
              label="ROC"
              value={
                baseline.roc != null ? `${Math.round(baseline.roc)}×` : "not set"
              }
            />
          </dl>
        </Card>
      ) : (
        <p className="flex h-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Store a forecast baseline on Forecast. Realized consumption versus
          that forecast will land here after outcome tracking exists.
        </p>
      )}
    </IntelligencePane>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm tabular-nums">{value}</dd>
    </div>
  );
}

function money(value: number | null) {
  return value == null ? "not set" : formatCurrency(value);
}
