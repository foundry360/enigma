import { saveBusinessCaseAction } from "@/app/actions/business-case";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Metric } from "@/components/ui/metric";
import { formatCurrency, formatMultiple, titleCase } from "@/lib/format";
import { scenarios, type Scenario } from "@/modules/economics/model";
import type { BusinessCaseDetail } from "@/server/services/business-case";

const scenarioLabel: Record<Scenario, string> = {
  conservative: "Conservative",
  expected: "Expected",
  aggressive: "Aggressive",
};

export function BusinessCasePanel({
  projectId,
  detail,
}: {
  projectId: string;
  detail: BusinessCaseDetail;
}) {
  const { businessCase, lines, rollup } = detail;

  return (
    <form action={saveBusinessCaseAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Scenario</legend>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario) => (
                <label
                  key={scenario}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-foreground"
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={scenario}
                    defaultChecked={businessCase.scenario === scenario}
                    className="accent-foreground"
                  />
                  {scenarioLabel[scenario]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="w-40">
            <Field
              label="Months accelerated"
              name="monthsAccelerated"
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(businessCase.monthsAccelerated)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Consumption"
            value={formatCurrency(rollup.consumption)}
            hint="Annual consumption cost"
            estimate
          />
          <Metric
            label="Value"
            value={formatCurrency(rollup.value)}
            hint="Annual labor value"
            estimate
          />
          <Metric
            label="ROC"
            value={formatMultiple(rollup.roc)}
            hint="Value / consumption"
            estimate
          />
          <Metric
            label="ROA"
            value={formatCurrency(rollup.roa)}
            hint="Value pulled forward"
            estimate
          />
        </div>

        <p className="mt-4 text-xs text-muted">
          Unit prices are customer assumptions, not official Salesforce pricing.
          Totals stay blank until a line has volume, unit price, hours saved,
          and hourly cost.
          {rollup.complete
            ? ` Implementation cost ${formatCurrency(rollup.implementation)}.`
            : null}
        </p>
      </section>

      {lines.map((line) => (
        <section
          key={line.id}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <input type="hidden" name="opportunityId" value={line.opportunityId} />
          <h2 className="text-sm font-bold">{titleCase(line.opportunityName)}</h2>
          <p className="mt-1 text-sm text-muted">
            {line.businessArea}
            <span className="mx-2">→</span>
            {line.recommendedCapability}
          </p>
          <p className="mt-1 text-xs text-muted">{line.unitHint}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field
              label="Annual volume"
              name={`annualVolume:${line.opportunityId}`}
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(line.annualVolume)}
            />
            <Field
              label="Unit price"
              name={`unitPrice:${line.opportunityId}`}
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(line.unitPrice)}
            />
            <Field
              label="Hours saved / unit"
              name={`hoursSavedPerUnit:${line.opportunityId}`}
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(line.hoursSavedPerUnit)}
            />
            <Field
              label="Hourly cost"
              name={`hourlyCost:${line.opportunityId}`}
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(line.hourlyCost)}
            />
            <Field
              label="Implementation cost"
              name={`implementationCost:${line.opportunityId}`}
              type="number"
              min={0}
              step="any"
              defaultValue={numberValue(line.implementationCost)}
            />
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <Button type="submit">Save business case</Button>
      </div>
    </form>
  );
}

function numberValue(value: number | null) {
  return value == null ? "" : String(value);
}
