import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startDiscoveryAction } from "@/app/actions/assessments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { ProjectIcon } from "@/components/ui/entity-icons";
import { PriorityMark } from "@/components/ui/priority-mark";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatLastActivity } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";
import { playbookLabel, projectPhases, projectProgress } from "@/lib/projects";
import { getProjectOverview } from "@/server/services/projects";

const activityLabels: Record<string, string> = {
  "project.create": "Project created",
  "project.update": "Project updated",
  "project.connection.attach": "Environment attached",
  "project.connection.detach": "Environment removed",
  "assessment.start": "Assessment started",
};

const phaseCopy: Record<string, string> = {
  Connect: "Connect a platform environment before discovery can start.",
  Discover: "A platform is connected. Start discovery when you are ready.",
  Assess: "Discovery is in progress. Scoring is not finished.",
  Prioritize: "Assessment is complete. Review findings before modeling value.",
  Model: "Value and consumption models are not implemented yet.",
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
  });
  const next = {
    connect: {
      title: primaryPlatform
        ? `Connect ${platformLabel(primaryPlatform)}`
        : "Connect a platform",
      detail: `A connected environment is required before ${playbook} can start.`,
      href: `/projects/${project.id}/connections` as string | null,
    },
    discover: {
      title: `Start ${playbook}`,
      detail:
        "Discovery collects the evidence used for readiness and opportunities.",
      href: null,
    },
    continue: {
      title: "Continue assessment",
      detail: `${playbook} is in progress. Discovery and scoring are not finished.`,
      href: `/projects/${project.id}/assessments`,
    },
    review: {
      title: "Review assessment",
      detail: `${playbook} is complete. Review findings before modeling value.`,
      href: `/projects/${project.id}/assessments`,
    },
  }[nextAction];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="p-5 lg:p-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <ProjectIcon size={26} />
            <span className="truncate">{project.name}</span>
          </h1>
        </div>
        <div className="grid border-t border-border lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)] lg:divide-x lg:divide-border">
          <div className="p-5 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold">Project objective</h2>
            <p className="text-base leading-relaxed">{project.objective}</p>
          </div>
          <div className="p-5 lg:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Next recommended action</h2>
              {next.href ? (
                <Link href={next.href} className={buttonClassName()}>
                  Start
                </Link>
              ) : (
                <form action={startDiscoveryAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <Button type="submit">Start</Button>
                </form>
              )}
            </div>
            <p className="text-sm font-medium">{next.title}</p>
            <p className="mt-1 text-sm text-muted">{next.detail}</p>
          </div>
        </div>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Platforms"
          count={scopedPlatforms.length}
          hint={
            scopedPlatforms.length > 0
              ? scopedPlatforms.map(platformLabel).join(", ")
              : "None in scope"
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
          label="Assessments"
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
                tone={project.status === "Active" ? "connected" : "neutral"}
              >
                {project.status}
              </Badge>
            </MetaRow>
          </div>
          <div className="md:pl-6">
            <MetaRow label="Project type">{project.projectType}</MetaRow>
            <MetaRow label="Platforms in scope">
              {scopedPlatforms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {scopedPlatforms.map((platform) => (
                    <Badge key={platform}>{platformLabel(platform)}</Badge>
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

      <div className="grid gap-4 lg:grid-cols-2">
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
              className="h-full bg-connected"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
          <ol className="mt-4 space-y-1.5">
            {projectPhases.map((phase, index) => {
              const done = index < progress.completed;
              const current = phase === progress.current;

              return (
                <li
                  key={phase}
                  className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm ${
                    current
                      ? "bg-surface-2 text-foreground"
                      : done
                        ? "text-foreground"
                        : "text-muted"
                  }`}
                >
                  {phase}
                  {done ? (
                    <span className="text-connected">✓</span>
                  ) : current ? (
                    <span className="text-xs text-muted">Current</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
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
              {activity.map((event, index) => (
                <li key={event.id} className="relative flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 bg-surface ${
                      index === 0
                        ? "border-connected"
                        : "border-muted"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {activityLabels[event.action] ??
                        `${event.entity} ${event.action.split(".").at(-1) ?? event.action}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatLastActivity(event.createdAt)}
                    </p>
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
