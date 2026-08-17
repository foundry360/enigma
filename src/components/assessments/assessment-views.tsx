"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AssessmentFilter,
  emptyAssessmentFilters,
  type AssessmentFilters,
} from "@/components/assessments/assessment-filter";
import {
  AssessmentStatusMark,
  assessmentLabel,
} from "@/components/ui/status-dot";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";
import { formatDate } from "@/lib/format";

const VIEW_STORAGE_KEY = "enigma-assessment-view";
const DEFAULT_VIEW: CollectionView = "list";

export type AssessmentListItem = {
  id: string;
  href: string;
  title: string;
  organizationName?: string;
  status: string;
  createdAt: Date | string;
};

function isCollectionView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

export function AssessmentViews({
  assessments,
}: {
  assessments: AssessmentListItem[];
}) {
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AssessmentFilters>(
    emptyAssessmentFilters,
  );

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
      assessments
        .map((assessment) => assessment.organizationName)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort();
  const showOrganization = organizations.length > 1;
  const normalized = query.trim().toLowerCase();
  const visible = assessments.filter((assessment) => {
    if (
      filters.organization &&
      assessment.organizationName !== filters.organization
    ) {
      return false;
    }
    if (filters.status && assessment.status !== filters.status) {
      return false;
    }
    if (!normalized) {
      return true;
    }

    return [
      assessment.title,
      assessment.organizationName,
      assessment.status,
      assessmentLabel(assessment.status),
    ].some((value) => value?.toLowerCase().includes(normalized));
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <label className="sr-only" htmlFor="assessment-search">
          Search assessments
        </label>
        <input
          id="assessment-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assessments"
          className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
        />
        <ViewToggle view={view} onChange={changeView} />
        <AssessmentFilter
          filters={filters}
          onChange={setFilters}
          organizations={showOrganization ? organizations : []}
        />
      </div>
      {assessments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No assessments yet. Start one from a project after a platform is
          connected.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No assessments match that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((assessment) => (
            <Link
              key={assessment.id}
              href={assessment.href}
              className="flex min-h-[140px] flex-col rounded-md border border-border bg-background p-4 hover:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-sm font-semibold">
                  {assessment.title}
                </h2>
                <AssessmentStatusMark status={assessment.status} />
              </div>
              {showOrganization && assessment.organizationName ? (
                <p className="mt-1 text-sm text-muted">
                  {assessment.organizationName}
                </p>
              ) : null}
              <p className="mt-auto pt-4 text-xs text-muted">
                Started {formatDate(assessment.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Assessment</th>
                {showOrganization ? (
                  <th className="px-3 py-2 font-medium">Organization</th>
                ) : null}
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((assessment) => (
                <tr
                  key={assessment.id}
                  className="border-t border-border bg-background hover:bg-surface-2"
                >
                  <td className="px-3 py-2 font-medium">
                    <Link href={assessment.href} className="hover:underline">
                      {assessment.title}
                    </Link>
                  </td>
                  {showOrganization ? (
                    <td className="px-3 py-2 text-muted">
                      {assessment.organizationName ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <AssessmentStatusMark status={assessment.status} />
                      <span className="text-muted">
                        {assessmentLabel(assessment.status)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {formatDate(assessment.createdAt)}
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
