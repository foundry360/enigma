"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreateProjectButton } from "@/components/projects/create-project-modal";
import {
  emptyProjectFilters,
  ProjectFilter,
  type ProjectFilters,
} from "@/components/projects/project-filter";
import { PriorityMark } from "@/components/ui/priority-mark";
import { ProjectStatusMark } from "@/components/ui/status-dot";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";

const VIEW_STORAGE_KEY = "enigma-project-view";
const DEFAULT_VIEW: CollectionView = "cards";

export type ProjectListItem = {
  id: string;
  name: string;
  projectType: string;
  status: string;
  priority: string | null;
  organizationName?: string;
};

function isCollectionView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

export function ProjectViews({
  projects,
}: {
  projects: ProjectListItem[];
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

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
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
      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a project for a customer organization.
          </p>
          <div className="mt-3">
            <CreateProjectButton />
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No projects match that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex min-h-[140px] flex-col rounded-md border border-border bg-background p-4 hover:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-sm font-semibold">{project.name}</h2>
                <ProjectStatusMark status={project.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {[
                  showOrganization ? project.organizationName : null,
                  project.projectType,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {project.priority ? (
                <div className="mt-auto flex justify-end pt-4">
                  <PriorityMark priority={project.priority} />
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                {showOrganization ? (
                  <th className="px-3 py-2 font-medium">Organization</th>
                ) : null}
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => (
                <tr
                  key={project.id}
                  className="border-t border-border bg-background hover:bg-surface-2"
                >
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  {showOrganization ? (
                    <td className="px-3 py-2 text-muted">
                      {project.organizationName ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-muted">{project.projectType}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <ProjectStatusMark status={project.status} />
                      <span className="text-muted">{project.status}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {project.priority ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PriorityMark priority={project.priority} />
                        <span className="text-muted">{project.priority}</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
