"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { setProjectEnvironmentAction } from "@/app/actions/projects";
import {
  ConnectionFilter,
  emptyConnectionFilters,
  type ConnectionFilters,
} from "@/components/projects/connection-filter";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  ConnectionStatusMark,
  connectionLabel,
} from "@/components/ui/status-dot";
import { ViewToggle, type CollectionView } from "@/components/ui/view-toggle";
import { formatLastActivity } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";

const VIEW_STORAGE_KEY = "enigma-connection-view-v2";
const DEFAULT_VIEW: CollectionView = "list";

export type ConnectionListItem = {
  id: string;
  projectId: string;
  name: string;
  platformType: string;
  status: string;
  externalOrgId: string | null;
  attached: boolean;
  updatedAt: Date | string;
};

function isCollectionView(value: string | null): value is CollectionView {
  return value === "cards" || value === "list";
}

function AttachButton({
  projectId,
  connectionId,
  attached,
}: {
  projectId: string;
  connectionId: string;
  attached: boolean;
}) {
  return (
    <form action={setProjectEnvironmentAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="connectionId" value={connectionId} />
      <input
        type="hidden"
        name="attached"
        value={attached ? "false" : "true"}
      />
      <Button type="submit" variant={attached ? "secondary" : "primary"}>
        {attached ? "Remove" : "Attach"}
      </Button>
    </form>
  );
}

export function ConnectionViews({
  connections,
  organizationId,
}: {
  connections: ConnectionListItem[];
  organizationId: string;
}) {
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ConnectionFilters>(
    emptyConnectionFilters,
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

  const normalized = query.trim().toLowerCase();
  const visible = connections.filter((connection) => {
    if (
      filters.platformType &&
      connection.platformType !== filters.platformType
    ) {
      return false;
    }
    if (filters.status && connection.status !== filters.status) {
      return false;
    }
    if (filters.scope === "attached" && !connection.attached) {
      return false;
    }
    if (filters.scope === "unattached" && connection.attached) {
      return false;
    }
    if (!normalized) {
      return true;
    }

    return [
      connection.name,
      platformLabel(connection.platformType),
      connection.platformType,
      connection.externalOrgId,
      connection.status,
      connectionLabel(connection.status),
      connection.attached ? "attached" : "not attached",
    ].some((value) => value?.toLowerCase().includes(normalized));
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <label className="sr-only" htmlFor="connection-search">
          Search connections
        </label>
        <input
          id="connection-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search connections"
          className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground"
        />
        <ViewToggle view={view} onChange={changeView} />
        <ConnectionFilter filters={filters} onChange={setFilters} />
        <Link
          href={`/accounts/${organizationId}/platforms`}
          className={buttonClassName("primary", "gap-1")}
        >
          <span aria-hidden="true">+</span>
          Connect
        </Link>
      </div>
      {connections.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium">No environments yet</p>
          <p className="mt-1 text-sm text-muted">
            Connect a platform on the organization, then attach it here.
          </p>
          <div className="mt-3">
            <Link
              href={`/accounts/${organizationId}/platforms`}
              className={buttonClassName()}
            >
              Organization platforms
            </Link>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No connections match that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {visible.map((connection) => (
            <div
              key={connection.id}
              className="flex min-h-[168px] flex-col rounded-md border border-border bg-background p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-base font-semibold">
                  {connection.name}
                </h2>
                <ConnectionStatusMark status={connection.status} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {platformLabel(connection.platformType)}
                {connection.externalOrgId
                  ? ` · ${connection.externalOrgId}`
                  : ""}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-6">
                <span className="text-xs text-muted">
                  {connection.attached ? "Attached" : "Not attached"}
                </span>
                <AttachButton
                  projectId={connection.projectId}
                  connectionId={connection.id}
                  attached={connection.attached}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Environment</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Instance</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium">Last activity</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((connection) => (
                <tr
                  key={connection.id}
                  className="border-t border-border bg-background hover:bg-surface-2"
                >
                  <td className="px-3 py-2 font-medium">{connection.name}</td>
                  <td className="px-3 py-2 text-muted">
                    {platformLabel(connection.platformType)}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {connection.externalOrgId ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <ConnectionStatusMark status={connection.status} />
                      <span className="text-muted">
                        {connectionLabel(connection.status)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {connection.attached ? "Attached" : "Not attached"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {formatLastActivity(connection.updatedAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AttachButton
                      projectId={connection.projectId}
                      connectionId={connection.id}
                      attached={connection.attached}
                    />
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
