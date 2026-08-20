"use client";

import { useState, type ReactNode } from "react";
import { approveBusinessCaseAction } from "@/app/actions/business-case";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatPercent,
} from "@/lib/format";
import {
  forecastDecisionLabel,
  type DeploymentForecast,
} from "@/modules/economics/forecast";
import { type Scenario } from "@/modules/economics/model";

const scenarioTitle: Record<Scenario, string> = {
  conservative: "Conservative",
  expected: "Expected",
  aggressive: "Aggressive",
};

const decisionTitle = {
  favorable: "Favorable",
  favorable_with_conditions: "Favorable with Conditions",
  requires_validation: "Requires More Validation",
  not_justified: "Not Currently Justified",
} as const;

export function DeploymentPanel({
  projectId,
  forecast,
}: {
  projectId: string;
  forecast: DeploymentForecast;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(forecast.caseStatus === "approved");
  const [open, setOpen] = useState({
    conditions: false,
    dependencies: false,
    risks: false,
    sensitivities: false,
    path: false,
  });
  const row = forecast.scenarios[forecast.selectedScenario];
  const canApprove = row.complete && forecast.gaps.length === 0 && !locked;

  async function approve() {
    setPending(true);
    setError(null);
    const result = await approveBusinessCaseAction(projectId);
    setPending(false);
    if (!result || "error" in result) {
      setError(
        result?.error === "incomplete"
          ? "The case still has gaps. Finish the business case before you lock a forecast baseline."
          : "The forecast baseline could not be saved.",
      );
      return;
    }
    setLocked(true);
  }

  return (
    <div className="space-y-4 pb-6">
      <Card>
        <h3 className="text-lg font-semibold">Forecast Summary</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Agent Share" value={shownPercent(row.agentShare)} />
          <Metric
            label="Impacted Work"
            value={count(row.impactedWork, "/ year")}
          />
          <Metric label="Annual Value" value={money(row.annualValue)} />
          <Metric label="Consumption" value={money(row.consumption)} />
          <Metric label="Net Annual" value={money(row.netAnnual)} />
          <Metric label="ROC" value={roc(row.roc)} />
        </div>
        <div className="mt-4 rounded-md border border-border bg-surface-2 px-4 py-4">
          <p className="text-sm font-medium">Forecast Position</p>
          <p className="mt-1 text-sm leading-relaxed">{forecast.position}</p>
        </div>
      </Card>

      <FoldCard
        title="Conditions to Realize Forecast"
        open={open.conditions}
        onToggle={() => setOpen((current) => ({ ...current, conditions: !current.conditions }))}
      >
        {forecast.conditions.length > 0 ? (
          <ul className="space-y-3">
            {forecast.conditions.map((item) => (
              <li key={item.source}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No named conditions were inherited from this run. Enigma will not
            invent them.
          </p>
        )}
      </FoldCard>

      <FoldCard
        title="Dependencies"
        open={open.dependencies}
        onToggle={() =>
          setOpen((current) => ({ ...current, dependencies: !current.dependencies }))
        }
      >
        {forecast.dependencies.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {forecast.dependencies.map((item) => (
              <li key={item.source}>{item.title}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No named dependencies were inherited from the opportunity or this
            run.
          </p>
        )}
      </FoldCard>

      <FoldCard
        title="Forecast Risks"
        open={open.risks}
        onToggle={() => setOpen((current) => ({ ...current, risks: !current.risks }))}
      >
        {forecast.risks.length > 0 ? (
          <ul className="space-y-4">
            {forecast.risks.map((item) => (
              <li key={item.source}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
                <p className="mt-1 text-xs text-muted">
                  Affects {item.affectedAssumption}. {item.validation}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No named forecast risks were inherited from this run.
          </p>
        )}
      </FoldCard>

      <FoldCard
        title="Forecast Sensitivities"
        open={open.sensitivities}
        onToggle={() =>
          setOpen((current) => ({ ...current, sensitivities: !current.sensitivities }))
        }
      >
        <ul className="space-y-3">
          {forecast.sensitivities.map((item) => (
            <li key={item.variable}>
              <p className="text-sm font-medium">{item.variable}</p>
              <p className="mt-1 text-sm text-muted">{item.effect}</p>
            </li>
          ))}
        </ul>
      </FoldCard>

      <FoldCard
        title="Forecast Path"
        open={open.path}
        onToggle={() => setOpen((current) => ({ ...current, path: !current.path }))}
      >
        <ol className="space-y-4">
          {forecast.path.map((stage) => (
            <li key={stage.id}>
              <p className="text-sm font-medium">{stage.title}</p>
              <p className="mt-1 text-sm text-muted">{stage.objective}</p>
              {stage.validation.length > 0 ? (
                <p className="mt-1 text-xs text-muted">
                  Validate: {stage.validation.join("; ")}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted">
                Could change the forecast: {stage.couldChange.join(", ")}
              </p>
            </li>
          ))}
        </ol>
      </FoldCard>

      <Card>
        <h3 className="text-lg font-semibold">Forecast Baseline</h3>
        <p className="mt-1 text-sm text-muted">
          The approved scenario is what Outcomes can later compare against
          actuals. Actual tracking is not on this page yet.
        </p>
        {forecast.baseline ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Scenario" value={scenarioTitle[forecast.baseline.scenario]} />
            <Meta label="Work Per Year" value={count(forecast.baseline.workPerYear)} />
            <Meta
              label="Agent Share"
              value={shownPercent(forecast.baseline.agentShare)}
            />
            <Meta
              label="Impacted Work"
              value={count(forecast.baseline.impactedWork)}
            />
            <Meta
              label="Work Item Cost"
              value={rate(forecast.baseline.workItemCost)}
            />
            <Meta
              label="Consumption"
              value={money(forecast.baseline.consumption)}
            />
            <Meta
              label="Annual Value"
              value={money(forecast.baseline.annualValue)}
            />
            <Meta label="Net Annual" value={money(forecast.baseline.netAnnual)} />
            <Meta label="ROC" value={roc(forecast.baseline.roc)} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Approve the forecast to store this scenario as the baseline.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted">Deployment Decision</p>
            <h3 className="mt-1 text-lg font-semibold">
              {decisionTitle[forecast.decision]}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {forecastDecisionLabel[forecast.decision]}
            </p>
            {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          </div>
          {locked ? (
            <p className="text-sm font-medium">Baseline stored</p>
          ) : (
            <Button type="button" disabled={pending || !canApprove} onClick={approve}>
              {pending ? "Saving…" : "Store forecast baseline"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function FoldCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-base font-semibold">{title}</span>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent text-lg font-semibold leading-none text-accent-fg"
        >
          {open ? "-" : "+"}
        </span>
      </button>
      {open ? <div className="border-t border-border px-4 py-4">{children}</div> : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function money(value: number | null) {
  return value == null ? "not set" : formatCurrency(value);
}

function rate(value: number | null) {
  return value == null ? "not set" : formatCurrencyPrecise(value);
}

function count(value: number | null, suffix = "") {
  if (value == null) {
    return "not set";
  }
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function shownPercent(value: number | null) {
  return value == null ? "not set" : formatPercent(value);
}

function roc(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "not set";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}×` : `${rounded.toFixed(1)}×`;
}
