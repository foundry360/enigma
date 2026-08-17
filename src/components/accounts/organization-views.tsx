"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectAccountAction } from "@/app/actions/accounts";
import { CreateOrganizationButton } from "@/components/accounts/create-organization-modal";
import {
  emptyOrganizationFilters,
  OrganizationFilter,
  type OrganizationFilters,
} from "@/components/accounts/organization-filter";
import {
  connectionLabel,
  connectionTone,
  StatusDot,
} from "@/components/ui/status-dot";
import { OrganizationIcon } from "@/components/ui/entity-icons";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";
import { formatLastActivity } from "@/lib/format";

const VIEW_STORAGE_KEY = "enigma-organization-view";
const DEFAULT_VIEW: CollectionView = "cards";

export type OrganizationListItem = {
  id: string;
  name: string;
  industry: string | null;
  organizationType: string | null;
  employeeRange: string | null;
  primaryContact: string | null;
  customerStatus: string | null;
  connectionStatus: string;
  environmentCount: number;
  projectCount: number;
  assessmentStatus: string;
  updatedAt: Date | string;
};

function CustomerStatusMark({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  const icon =
    status === "Active" ? (
      <path d="m8 12 2.5 2.5L16 9" />
    ) : status === "Inactive" ? (
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    ) : (
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    );

  return (
    <span
      title={status}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        status === "Active"
          ? "border-connected text-connected"
          : status === "Inactive"
            ? "border-red-500/70 text-red-500"
            : "border-muted text-muted"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
      <span className="sr-only">{status}</span>
    </span>
  );
}

function isOrganizationView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

export function OrganizationViews({
  organizations,
}: {
  organizations: OrganizationListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<OrganizationFilters>(
    emptyOrganizationFilters,
  );

  function openOrganization(organizationId: string) {
    if (pending) {
      return;
    }

    startTransition(async () => {
      await selectAccountAction(organizationId);
      router.push(`/accounts/${organizationId}`);
    });
  }

  useEffect(() => {
    window.localStorage.removeItem("enigma-org-view");
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isOrganizationView(stored)) {
      setView(stored);
    }
  }, []);

  function changeView(next: CollectionView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const normalized = query.trim().toLowerCase();
  const visible = organizations.filter((organization) => {
    if (filters.industry && organization.industry !== filters.industry) {
      return false;
    }
    if (
      filters.connectionStatus &&
      organization.connectionStatus !== filters.connectionStatus
    ) {
      return false;
    }
    if (
      filters.customerStatus &&
      organization.customerStatus !== filters.customerStatus
    ) {
      return false;
    }
    if (
      filters.assessmentStatus &&
      organization.assessmentStatus !== filters.assessmentStatus
    ) {
      return false;
    }
    if (!normalized) {
      return true;
    }

    return [
      organization.name,
      organization.industry,
      organization.organizationType,
      organization.employeeRange,
      organization.primaryContact,
      organization.customerStatus,
      organization.connectionStatus,
      organization.assessmentStatus,
    ].some((value) => value?.toLowerCase().includes(normalized));
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <label className="sr-only" htmlFor="organization-search">
          Search organizations
        </label>
        <input
          id="organization-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations"
          className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
        />
        <ViewToggle view={view} onChange={changeView} />
        <OrganizationFilter filters={filters} onChange={setFilters} />
        <CreateOrganizationButton />
      </div>
      {organizations.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No organizations yet. Create the customer you want to assess.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No organizations match that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {visible.map((organization) => (
            <button
              key={organization.id}
              type="button"
              disabled={pending}
              onClick={() => openOrganization(organization.id)}
              className="flex min-h-[168px] flex-col rounded-md border border-border bg-background p-6 text-left hover:bg-surface-2 disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
                  <OrganizationIcon />
                  <span className="truncate">{organization.name}</span>
                </h2>
                <CustomerStatusMark status={organization.customerStatus} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {[organization.industry, organization.organizationType]
                  .filter(Boolean)
                  .join(" · ") || "No profile yet"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {organization.primaryContact ?? "No primary contact"}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-6">
                <span className="inline-flex items-center text-xs text-muted">
                  <StatusDot
                    tone={connectionTone(
                      organization.connectionStatus === "Not connected"
                        ? "DISCONNECTED"
                        : organization.connectionStatus,
                    )}
                  />
                  {organization.connectionStatus === "Not connected"
                    ? "Not connected"
                    : connectionLabel(organization.connectionStatus)}
                </span>
                <span className="text-xs text-muted">
                  {organization.projectCount}{" "}
                  {organization.projectCount === 1 ? "project" : "projects"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Employees</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Environments</th>
                <th className="px-3 py-2 font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((organization) => (
                <tr
                  key={organization.id}
                  className="cursor-pointer border-t border-border bg-background hover:bg-surface-2"
                  onClick={() => openOrganization(organization.id)}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex min-w-0 items-center gap-2 hover:underline">
                      <OrganizationIcon />
                      <span className="truncate">{organization.name}</span>
                    </span>
                    <p className="text-xs text-muted">
                      {organization.industry ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.organizationType ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.employeeRange ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.primaryContact ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {organization.customerStatus ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CustomerStatusMark
                          status={organization.customerStatus}
                        />
                        <span className="text-muted">
                          {organization.customerStatus}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.environmentCount}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {organization.projectCount}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {formatLastActivity(organization.updatedAt)}
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
