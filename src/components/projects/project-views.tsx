"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreateProjectButton } from "@/components/projects/create-project-modal";
import { ProjectRowMenu } from "@/components/projects/project-row-menu";
import {
  emptyProjectFilters,
  ProjectFilter,
  type ProjectFilters,
} from "@/components/projects/project-filter";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { PriorityMark } from "@/components/ui/priority-mark";
import { ProjectStatusMark } from "@/components/ui/status-dot";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";
import { formatDate, formatLastActivity } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";

const VIEW_STORAGE_KEY = "enigma-project-view";
const DEFAULT_VIEW: CollectionView = "cards";

export type ProjectListItem = {
  id: string;
  name: string;
  projectType: string;
  platformType: string | null;
  status: string;
  priority: string | null;
  createdAt: Date | string;
  organizationName?: string;
};

export type ProjectUpdateItem = {
  id: string;
  projectId: string | null;
  projectName: string;
  label: string;
  at: Date | string;
};

function isCollectionView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

export function ProjectViews({
  projects,
  updates,
}: {
  projects: ProjectListItem[];
  updates: ProjectUpdateItem[];
}) {
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ProjectFilters>(emptyProjectFilters);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isCollectionView(stored)) {
      setView(stored);
    }
  }, []);

  function changeView(next: CollectionView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const organizations = [
    ...new Set(
      projects
        .map((project) => project.organizationName)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort();
  const showOrganization = organizations.length > 1;
  const normalized = query.trim().toLowerCase();
  const visible = projects.filter((project) => {
    if (
      filters.organization &&
      project.organizationName !== filters.organization
    ) {
      return false;
    }
    if (filters.status && project.status !== filters.status) {
      return false;
    }
    if (filters.projectType && project.projectType !== filters.projectType) {
      return false;
    }
    if (filters.priority && project.priority !== filters.priority) {
      return false;
    }
    if (!normalized) {
      return true;
    }

    return [
      project.name,
      project.projectType,
      project.status,
      project.priority,
      project.organizationName,
    ].some((value) => value?.toLowerCase().includes(normalized));
  });
  const loaded = useLoadMore(
    visible,
    `${query}|${JSON.stringify(filters)}`,
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="shrink-0 text-2xl font-semibold tracking-tight">
          Projects
        </h1>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor="project-search">
            Search projects
          </label>
          <input
            id="project-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
          />
          <ViewToggle view={view} onChange={changeView} />
          <ProjectFilter
            filters={filters}
            onChange={setFilters}
            organizations={showOrganization ? organizations : []}
          />
          <CreateProjectButton>
            <span aria-hidden="true">+</span>
            New project
          </CreateProjectButton>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <ProjectRecentUpdates updates={updates} />
        <div className="min-w-0">
          {projects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted">
                Create a project for a customer organization.
              </p>
              <div className="mt-3">
                <CreateProjectButton />
              </div>
            </div>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No projects match that search or filter.
            </p>
          ) : view === "cards" ? (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {loaded.items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  showOrganization={showOrganization}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Project</th>
                    {showOrganization ? (
                      <th className="px-3 py-2 font-medium">Organization</th>
                    ) : null}
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="py-2 pl-3 font-medium">Created</th>
                    <th className="w-10 py-2 pl-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loaded.items.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-border hover:bg-surface-2"
                    >
                      <td className="py-2.5 pr-3 font-medium">
                        <ProjectTitle project={project} />
                      </td>
                      {showOrganization ? (
                        <td className="px-3 py-2 text-muted">
                          {project.organizationName ?? "—"}
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5 text-muted">
                        {project.projectType}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <ProjectStatusMark status={project.status} />
                          <span className="text-muted">{project.status}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {project.priority ? (
                          <span className="inline-flex items-center gap-1.5">
                            <PriorityMark priority={project.priority} />
                            <span className="text-muted">{project.priority}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-muted">
                        {formatDate(project.createdAt)}
                      </td>
                      <td className="py-2.5 pl-2">
                        <ProjectRowMenu
                          projectId={project.id}
                          name={project.name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <LoadMoreButton hasMore={loaded.hasMore} onLoadMore={loaded.loadMore} />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  showOrganization,
}: {
  project: ProjectListItem;
  showOrganization: boolean;
}) {
  const salesforce = project.platformType === "SALESFORCE";

  return (
    <div className="flex min-h-40 flex-col rounded-md border border-border bg-background p-4 hover:bg-surface-2">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          {salesforce ? (
            <img
              src="/brands/salesforce.png"
              alt=""
              className="h-8 w-auto shrink-0"
            />
          ) : null}
          <span className="truncate text-xs text-muted">
            {platformLabel(project.platformType)}
          </span>
        </span>
        <div className="relative z-10 shrink-0">
          <ProjectRowMenu projectId={project.id} name={project.name} />
        </div>
      </div>
      <h2 className="mt-3 truncate text-sm font-semibold">
        <Link href={`/projects/${project.id}`} className="hover:underline">
          {project.name}
        </Link>
      </h2>
      <p className="mt-1 truncate text-sm text-muted">
        {[
          showOrganization ? project.organizationName : null,
          project.projectType,
          formatDate(project.createdAt),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function ProjectTitle({ project }: { project: ProjectListItem }) {
  const salesforce = project.platformType === "SALESFORCE";

  return (
    <span className="inline-flex min-w-0 items-start gap-2">
      {salesforce ? (
        <img
          src="/brands/salesforce.png"
          alt="Salesforce"
          className="h-8 w-auto shrink-0"
        />
      ) : null}
      <span className="min-w-0">
        <Link
          href={`/projects/${project.id}`}
          className="block truncate font-medium hover:underline"
        >
          {project.name}
        </Link>
        <span className="mt-0.5 block truncate text-xs font-normal text-muted">
          {platformLabel(project.platformType)}
        </span>
      </span>
    </span>
  );
}

const COLLAPSED_UPDATES = 6;
const EXPANDED_UPDATES = 20;

function ProjectRecentUpdates({ updates }: { updates: ProjectUpdateItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = updates.slice(
    0,
    expanded ? EXPANDED_UPDATES : COLLAPSED_UPDATES,
  );
  const canExpand = updates.length > COLLAPSED_UPDATES;

  return (
    <aside className="rounded-lg border border-border bg-background p-4">
      <h2 className="text-sm font-semibold">Last 30 Days</h2>
      {updates.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No updates in the last 30 days.
        </p>
      ) : (
        <>
          <ol className="relative mt-4 space-y-4">
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
            />
            {visible.map((update) => (
              <li key={update.id} className="relative flex gap-3">
                <span
                  aria-hidden="true"
                  className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-accent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {update.projectId ? (
                        <Link
                          href={`/projects/${update.projectId}`}
                          className="hover:underline"
                        >
                          {update.projectName}
                        </Link>
                      ) : (
                        update.projectName
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-muted">
                      {formatLastActivity(update.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{update.label}</p>
                </div>
              </li>
            ))}
          </ol>
          {canExpand ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={
                  expanded ? "Show fewer updates" : "Show more updates"
                }
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-2 hover:text-foreground"
                onClick={() => setExpanded((value) => !value)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-3.5 w-3.5 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path d="m5 7.5 5 5 5-5" />
                </svg>
              </button>
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
