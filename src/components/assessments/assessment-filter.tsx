"use client";

import { useEffect, useId, useRef, useState } from "react";

const statusFilters = ["COMPLETE", "FAILED"] as const;

const statusLabels: Record<string, string> = {
  COMPLETE: "Complete",
  FAILED: "Failed",
};

export type AssessmentFilters = {
  organization: string;
  status: string;
};

export const emptyAssessmentFilters: AssessmentFilters = {
  organization: "",
  status: "",
};

export function assessmentFilterCount(filters: AssessmentFilters) {
  return Object.values(filters).filter(Boolean).length;
}

export function AssessmentFilter({
  filters,
  onChange,
  organizations = [],
}: {
  filters: AssessmentFilters;
  onChange: (filters: AssessmentFilters) => void;
  organizations?: readonly string[];
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const active = assessmentFilterCount(filters);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm ${
          active
            ? "border-border bg-surface-2 text-foreground"
            : "border-border bg-background text-muted hover:text-foreground"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 5h18" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        </svg>
        Filter
        {active ? <span className="text-xs text-muted">{active}</span> : null}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-surface p-2 shadow-sm"
        >
          {organizations.length > 0 ? (
            <FilterSelect
              label="Organization"
              value={filters.organization}
              options={organizations}
              onChange={(organization) => onChange({ ...filters, organization })}
            />
          ) : null}
          <FilterSelect
            label="Status"
            value={filters.status}
            options={statusFilters}
            labels={statusLabels}
            onChange={(status) => onChange({ ...filters, status })}
          />
          {active ? (
            <button
              type="button"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-foreground"
              onClick={() => onChange(emptyAssessmentFilters)}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-2 block last:mb-0">
      <span className="mb-1 block px-0.5 text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-foreground"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
