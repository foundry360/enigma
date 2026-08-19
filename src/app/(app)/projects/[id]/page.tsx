import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProjectButton } from "@/components/projects/create-project-modal";
import { Badge } from "@/components/ui/badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency, formatDate, formatLastActivity } from "@/lib/format";
import { sumProjectInvestment } from "@/modules/economics/model";
import { platformLabel } from "@/lib/platforms";
import { playbookLabel, projectPhases, projectProgress } from "@/lib/projects";
import { getProjectOverview } from "@/server/services/projects";

const activityLabels: Record<string, string> = {
  "project.create": "Project created",
  "project.update": "Project updated",
  "project.connection.attach": "Environment attached",
  "project.connection.detach": "Environment removed",
  "assessment.start": "Intelligence started",
};

const phaseCopy: Record<string, string> = {
  Connect: "Connect a platform environment before discovery can start.",
  Discover: "A platform is connected. Run intelligence when you are ready.",
  Assess: "Intelligence is in progress. Signals are not finished.",
  Prioritize: "Review opportunity candidates, then model consumption.",
  Model: "Consumption, ROC, and ROA are not built yet.",
  Recommend: "Recommendations and roadmap are not implemented yet.",
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function AssumptionRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  count,
  mark,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  count?: ReactNode;
  mark?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          {value ? (
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          ) : null}
          {hint ? (
            <p className={`text-xs text-muted ${value ? "mt-0.5" : "mt-1"}`}>
              {hint}
            </p>
          ) : null}
        </div>
        {count != null ? (
          <dd className="text-2xl font-semibold leading-none tracking-tight">
            {count}
          </dd>
        ) : (
          mark
        )}
      </div>
    </div>
  );
}

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const {
    project,
    organization,
    owner,
    platforms,
    environments,
    assessment,
    assessments,
    activity,
    nextAction,
    hasBusinessCase,
    businessCaseStatus,
  } = overview;
  const scopedPlatforms =
    platforms.length > 0
      ? platforms.map((platform) => platform.platformType)
      : project.platformType
        ? [project.platformType]
        : [];
  const primaryPlatform = scopedPlatforms[0] ?? null;
  const playbook = playbookLabel(
    project.projectType,
    primaryPlatform ? platformLabel(primaryPlatform) : null,
  );
  const progress = projectProgress({
    connected: nextAction !== "connect",
    assessmentStatus: assessment?.status,
    hasBusinessCase,
    businessCaseStatus,
  });
  const next = {
    connect: `A connected environment is required before ${playbook} can start.`,
    discover: "Run intelligence against the connected environment.",
    continue: `${playbook} is in progress. Signals are not finished.`,
    prioritize:
      "Review opportunity candidates from the latest intelligence run.",
  }[nextAction];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 p-5 lg:p-6">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <EditProjectButton projectId={project.id} />
        </div>
        <div className="grid border-t border-border lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)] lg:divide-x lg:divide-border">
          <div className="p-5 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold">Project objective</h2>
            <p className="text-base leading-relaxed">{project.objective}</p>
          </div>
          <div className="p-5 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold">
              Next recommended action
            </h2>
            <p className="text-sm text-muted">{next}</p>
          </div>
        </div>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Platforms"
          count={scopedPlatforms.length}
          value={
            scopedPlatforms.length > 0 ? (
              <span className="font-semibold">
                {scopedPlatforms.map(platformLabel).join(", ")}
              </span>
            ) : (
              "None in scope"
            )
          }
        />
        <Metric
          label="Environments"
          count={environments.length}
          hint={
            environments.length > 0
              ? "Attached to this project"
              : "None attached"
          }
        />
        <Metric
          label="Run History"
          count={assessments.length}
          hint={
            assessment
              ? assessment.status === "COMPLETE"
                ? "Complete"
                : "In progress"
              : "Not started"
          }
        />
        <Metric
          label="Target date"
          value={
            project.targetDate ? formatDate(project.targetDate) : "Not set"
          }
          mark={
            project.priority ? (
              <PriorityMark priority={project.priority} />
            ) : null
          }
        />
      </dl>

      <section className="rounded-lg border border-border bg-surface px-5 py-2 lg:px-6">
        <dl className="divide-y divide-border md:grid md:grid-cols-2 md:divide-x md:divide-y-0 md:divide-border">
          <div className="md:pr-6">
            <MetaRow label="Organization">
              {organization ? (
                <Link
                  href={`/accounts/${organization.id}`}
                  className="font-medium hover:text-foreground"
                >
                  {organization.name}
                </Link>
              ) : (
                "—"
              )}
            </MetaRow>
            <MetaRow label="Owner">{owner?.name ?? "Unassigned"}</MetaRow>
            <MetaRow label="Status">
              <Badge
                tone={
                  progress.completed >= 2 ? "connected" : "neutral"
                }
              >
                {progress.current}
              </Badge>
            </MetaRow>
          </div>
          <div className="md:pl-6">
            <MetaRow label="Project type">{project.projectType}</MetaRow>
            <MetaRow label="Platform in scope">
              {scopedPlatforms.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {scopedPlatforms.map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex items-center gap-2"
                    >
                      {platform === "SALESFORCE" ? (
                        <img
                          src="/brands/salesforce.png"
                          alt=""
                          className="h-8 w-auto"
                        />
                      ) : null}
                      <Badge>{platformLabel(platform)}</Badge>
                    </span>
                  ))}
                </div>
              ) : (
                "Not set"
              )}
            </MetaRow>
            <MetaRow label="Current phase">
              <span className="font-medium">{progress.current}</span>
            </MetaRow>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Progress"
          action={
            <Badge>
              {progress.completed}/{progress.total}
            </Badge>
          }
        >
          <p className="text-sm text-muted">{phaseCopy[progress.current]}</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-accent"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
          <ol className="mt-3 space-y-0">
            {projectPhases.map((phase, index) => {
              const done = index < progress.completed;
              const current = phase === progress.current;

              return (
                <li
                  key={phase}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1 text-sm ${
                    current
                      ? "bg-surface-2 text-foreground"
                      : done
                        ? "text-foreground"
                        : "text-muted"
                  }`}
                >
                  {phase}
                  {done ? (
                    <span className="text-accent">✓</span>
                  ) : current ? (
                    <span className="text-xs text-muted">Current</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title="Investment">
          <dl>
            <AssumptionRow
              label="Discovery"
              value={formatCurrency(project.discoveryCost)}
            />
            <AssumptionRow
              label="Implementation"
              value={formatCurrency(project.implementationCost)}
            />
            <AssumptionRow
              label="Knowledge"
              value={formatCurrency(project.knowledgeCost)}
            />
            <AssumptionRow
              label="Change management"
              value={formatCurrency(project.changeManagementCost)}
            />
            <AssumptionRow
              label="Services"
              value={formatCurrency(project.servicesCost)}
            />
            <AssumptionRow
              label="Other"
              value={formatCurrency(project.otherCost)}
            />
            <div className="mt-1 border-t border-border pt-1">
              <AssumptionRow
                label="Total"
                value={
                  formatCurrency(
                    sumProjectInvestment({
                      discovery: project.discoveryCost,
                      implementation: project.implementationCost,
                      knowledge: project.knowledgeCost,
                      change: project.changeManagementCost,
                      services: project.servicesCost,
                      other: project.otherCost,
                    }),
                  )
                }
              />
            </div>
          </dl>
        </Card>

        <Card title="Recent activity">
          {activity.length === 0 ? (
            <p className="text-sm text-muted">
              No recorded activity for this project yet.
            </p>
          ) : (
            <ol className="relative space-y-4">
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
              />
              {activity.slice(0, 6).map((event) => (
                <li key={event.id} className="relative flex gap-3">
                  <span
                    aria-hidden="true"
                    className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-accent"
                  />
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <p className="min-w-0 shrink truncate text-sm">
                      {activityLabels[event.action] ??
                        `${event.entity} ${event.action.split(".").at(-1) ?? event.action}`}
                    </p>
                    <span
                      aria-hidden="true"
                      className="mb-1 min-w-4 flex-1 border-b border-dotted border-border"
                    />
                    <span className="shrink-0 text-xs text-muted">
                      {formatLastActivity(event.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
