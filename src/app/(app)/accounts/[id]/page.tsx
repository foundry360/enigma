import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateProjectButton } from "@/components/projects/create-project-modal";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { connectionLabel } from "@/components/ui/status-dot";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatLastActivity } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";
import { getOrganizationOverview } from "@/server/services/organization-overview";

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

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
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export default async function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getOrganizationOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const {
    organization,
    landscape,
    connections,
    projects,
    assessments,
    assessmentSummary,
    intelligence,
    activity,
    environmentCount,
    lastActivityAt,
  } = overview;
  const connected = connections.some(
    (connection) => connection.status === "CONNECTED",
  );
  const checklist = [
    { label: "Create organization", done: true },
    { label: "Connect a platform", done: connected },
    { label: "Create a project", done: projects.length > 0 },
    { label: "Run an assessment", done: assessments.length > 0 },
    { label: "Review opportunities", done: false },
  ];
  const complete = checklist.filter((item) => item.done).length;
  const maxEnvironments = Math.max(
    ...landscape.map((platform) => platform.environments),
    0,
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {organization.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Where this customer stands and what is in motion.
            </p>
          </div>
          <CreateProjectButton organizationId={id} />
        </div>
        <div className="grid gap-6 border-t border-border p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-6">
          <div className="flex min-h-56 flex-col rounded-md border border-border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Enterprise intelligence</h2>
              <Badge>Organization-wide</Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Active initiatives</dt>
                <dd>{intelligence.initiatives}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Technology complexity</dt>
                <dd>{intelligence.technologyComplexity ?? "Not enough data"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">AI transformation coverage</dt>
                <dd>Not enough data</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Platforms assessed</dt>
                <dd>Not enough data</dd>
              </div>
            </dl>
          </div>
          <dl className="divide-y divide-border">
            <MetaRow label="Organization">
              <p className="font-medium">{organization.name}</p>
            </MetaRow>
            <MetaRow label="Industry">
              {organization.industry ?? "—"}
            </MetaRow>
            <MetaRow label="Type">
              {organization.organizationType ?? "—"}
            </MetaRow>
            <MetaRow label="Employees">
              {organization.employeeRange ?? "—"}
            </MetaRow>
            <MetaRow label="Primary contact">
              {organization.primaryContact ?? "—"}
            </MetaRow>
            <MetaRow label="Status">
              {organization.customerStatus ?? "—"}
            </MetaRow>
            <MetaRow label="Environments">
              Connected ({environmentCount})
            </MetaRow>
            <MetaRow label="Created">
              {formatDate(organization.createdAt)}
            </MetaRow>
            <MetaRow label="Last activity">
              {formatLastActivity(lastActivityAt)}
            </MetaRow>
          </dl>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Getting started</span>
            <Badge tone="accent">
              {complete}/{checklist.length} complete
            </Badge>
            <p className="text-sm text-muted">
              Connect a platform, then create a project to assess this
              organization.
            </p>
          </div>
          <Link
            href={`/accounts/${id}/projects`}
            className={buttonClassName("secondary")}
          >
            Projects
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Checklist"
          action={
            <Badge>
              {complete}/{checklist.length}
            </Badge>
          }
        >
          <ul className="space-y-1.5">
            {checklist.map((item) => (
              <li
                key={item.label}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm ${
                  item.done
                    ? "bg-surface-2 text-foreground"
                    : "bg-background text-muted"
                }`}
              >
                {item.label}
                {item.done ? (
                  <span className="text-connected">✓</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Projects"
          action={<span className="text-xs text-muted">{projects.length}</span>}
        >
          {projects.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <Empty>No transformation projects yet.</Empty>
              <CreateProjectButton
                organizationId={id}
                className={buttonClassName("primary", "mt-3 gap-1")}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-md border border-border bg-background px-3 py-2.5 hover:bg-surface-2"
                >
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Last activity {formatLastActivity(project.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Connected environments"
          action={<Badge>{environmentCount}</Badge>}
        >
          {connections.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <Empty>
                No environments connected. An environment is a specific
                instance such as production or sandbox, not the organization
                itself.
              </Empty>
              <Link
                href={`/accounts/${id}/platforms`}
                className={buttonClassName("secondary", "mt-3")}
              >
                Platforms
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {connections.map((connection) => (
                <li
                  key={connection.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {connection.externalOrgName ??
                        `${platformLabel(connection.platformType)} environment`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {platformLabel(connection.platformType)}
                      {connection.externalOrgId
                        ? ` · ${connection.externalOrgId}`
                        : connection.externalOrgName
                          ? ` · ${connection.externalOrgName}`
                          : ""}
                    </p>
                  </div>
                  <Badge
                    tone={
                      connection.status === "CONNECTED"
                        ? "connected"
                        : "neutral"
                    }
                  >
                    {connectionLabel(connection.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Assessments"
          action={<Badge>{assessmentSummary.total}</Badge>}
        >
          {assessmentSummary.total === 0 ? (
            <Empty>
              No assessments have been completed for this organization.
            </Empty>
          ) : (
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <dt className="text-xs text-muted">Total</dt>
                <dd className="mt-1 font-medium">{assessmentSummary.total}</dd>
              </div>
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <dt className="text-xs text-muted">Completed</dt>
                <dd className="mt-1 font-medium">
                  {assessmentSummary.completed}
                </dd>
              </div>
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <dt className="text-xs text-muted">Active</dt>
                <dd className="mt-1 font-medium">{assessmentSummary.active}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card title="Recent activity">
          {activity.length === 0 ? (
            <Empty>No recorded activity for this organization yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 8).map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{event.label}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatLastActivity(event.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Platform distribution">
          {landscape.length === 0 ? (
            <Empty>No platform distribution yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {landscape.map((platform) => (
                <li key={platform.platformType}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{platform.name}</span>
                    <span className="text-muted">{platform.environments}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${
                          maxEnvironments
                            ? (platform.environments / maxEnvironments) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
