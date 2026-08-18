"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AssessmentFilter,
  emptyAssessmentFilters,
  type AssessmentFilters,
} from "@/components/assessments/assessment-filter";
import { DateRangePicker, toDayKey } from "@/components/ui/date-range-picker";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import {
  AssessmentStatusMark,
  assessmentLabel,
} from "@/components/ui/status-dot";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";
import { formatDate, formatTimeAgo } from "@/lib/format";

const VIEW_STORAGE_KEY = "enigma-assessment-view";
const DEFAULT_VIEW: CollectionView = "list";

export type AssessmentListItem = {
  id: string;
  href: string;
  title: string;
  organizationName?: string;
  status: string;
  score?: number | null;
  createdAt: Date | string;
};

function isCollectionView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

export function AssessmentViews({
  assessments,
  actions,
  title = "Run History",
  description,
}: {
  assessments: AssessmentListItem[];
  actions?: ReactNode;
  title?: string;
  description?: string;
}) {
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AssessmentFilters>(
    emptyAssessmentFilters,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
    const started = toDayKey(assessment.createdAt);
    if (from && started < from) {
      return false;
    }
    if (to && started > to) {
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
      assessment.score != null ? String(assessment.score) : "",
    ].some((value) => value?.toLowerCase().includes(normalized));
  });
  const loaded = useLoadMore(
    visible,
    `${query}|${from}|${to}|${JSON.stringify(filters)}`,
  );
  const latestId = assessments.reduce<AssessmentListItem | null>(
    (latest, item) => {
      if (!latest) {
        return item;
      }

      return new Date(item.createdAt) > new Date(latest.createdAt)
        ? item
        : latest;
    },
    null,
  )?.id;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="shrink-0 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor="assessment-search">
            Search run history
          </label>
          <input
            id="assessment-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search run history"
            className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
          />
          <ViewToggle view={view} onChange={changeView} />
          <DateRangePicker
            from={from}
            to={to}
            onChange={(range) => {
              setFrom(range.from);
              setTo(range.to);
            }}
          />
          <AssessmentFilter
            filters={filters}
            onChange={setFilters}
            organizations={showOrganization ? organizations : []}
          />
          {actions ? (
            <div key="assessment-actions" className="contents">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
      {assessments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No intelligence runs yet. Start one from a project after a platform
          is connected.
        </p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No run history matches that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loaded.items.map((assessment) => (
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
                {assessment.score != null ? `Score ${assessment.score} · ` : ""}
                Started {formatDate(assessment.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Run</th>
                {showOrganization ? (
                  <th className="px-3 py-2 font-medium">Organization</th>
                ) : null}
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="py-2 pl-3 font-medium">Run Complete</th>
              </tr>
            </thead>
            <tbody>
              {loaded.items.map((assessment) => (
                <tr
                  key={assessment.id}
                  className="border-b border-border hover:bg-surface-2"
                >
                  <td className="py-2.5 pr-3 font-medium">
                    <Link href={assessment.href} className="hover:underline">
                      {assessment.title}
                    </Link>
                  </td>
                  {showOrganization ? (
                    <td className="px-3 py-2.5 text-muted">
                      {assessment.organizationName ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 tabular-nums text-muted">
                    {assessment.score != null ? assessment.score : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <AssessmentStatusMark status={assessment.status} />
                      <span className="text-muted">
                        {assessmentLabel(assessment.status)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {formatDate(assessment.createdAt)}
                  </td>
                  <td className="py-2.5 pl-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        assessment.id === latestId
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-transparent text-muted"
                      }`}
                    >
                      {formatTimeAgo(assessment.createdAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMoreButton hasMore={loaded.hasMore} onLoadMore={loaded.loadMore} />
    </div>
  );
}
