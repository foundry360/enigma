"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CreateOrganizationButton } from "@/components/accounts/create-organization-modal";
import { Badge } from "@/components/ui/badge";

const VIEW_STORAGE_KEY = "enigma-organization-view";
const DEFAULT_VIEW: OrganizationView = "cards";

type OrganizationView = "cards" | "list";

export type OrganizationListItem = {
  id: string;
  name: string;
  industry: string | null;
  connectionStatus: string;
  assessmentStatus: string;
};

function isOrganizationView(
  value: string | null,
): value is OrganizationView {
  return value === "cards" || value === "list";
}

function ViewIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function OrganizationViewToggle({
  view,
  onChange,
}: {
  view: OrganizationView;
  onChange: (view: OrganizationView) => void;
}) {
  return (
    <div className="inline-flex">
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-sm ${
          view === "cards"
            ? "bg-surface-2 text-foreground"
            : "text-muted hover:text-foreground"
        }`}
        aria-label="Card view"
        aria-pressed={view === "cards"}
        onClick={() => onChange("cards")}
      >
        <ViewIcon>
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
        </ViewIcon>
      </button>
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-sm ${
          view === "list"
            ? "bg-surface-2 text-foreground"
            : "text-muted hover:text-foreground"
        }`}
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        <ViewIcon>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </ViewIcon>
      </button>
    </div>
  );
}

export function OrganizationViews({
  organizations,
}: {
  organizations: OrganizationListItem[];
}) {
  const [view, setView] = useState<OrganizationView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.localStorage.removeItem("enigma-org-view");
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isOrganizationView(stored)) {
      setView(stored);
    }
  }, []);

  function changeView(next: OrganizationView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const normalized = query.trim().toLowerCase();
  const visible = organizations.filter((organization) => {
    if (!normalized) {
      return true;
    }

    return [
      organization.name,
      organization.industry,
      organization.connectionStatus,
      organization.assessmentStatus,
    ].some((value) => value?.toLowerCase().includes(normalized));
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="sr-only" htmlFor="organization-search">
          Search organizations
        </label>
        <input
          id="organization-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations"
          className="h-8 w-full max-w-sm rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex shrink-0 items-center gap-2">
          <OrganizationViewToggle view={view} onChange={changeView} />
          <CreateOrganizationButton />
        </div>
      </div>
      {organizations.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No organizations yet. Create the customer you want to assess.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No organizations match that search.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {visible.map((organization) => (
            <Link
              key={organization.id}
              href={`/accounts/${organization.id}`}
              className="flex min-h-[168px] flex-col rounded-md border border-border bg-surface p-6 hover:bg-surface-2"
            >
              <h2 className="truncate text-base font-semibold">
                {organization.name}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {organization.industry ?? "No industry"}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-6">
                <Badge>{organization.connectionStatus}</Badge>
                <span className="text-xs text-muted">
                  {organization.assessmentStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Industry</th>
                <th className="px-3 py-2 font-medium">Connection</th>
                <th className="px-3 py-2 font-medium">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((organization) => (
                <tr
                  key={organization.id}
                  className="border-t border-border bg-surface hover:bg-surface-2"
                >
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/accounts/${organization.id}`}
                      className="hover:underline"
                    >
                      {organization.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.industry ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge>{organization.connectionStatus}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.assessmentStatus}
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
