"use client";

import { useEffect, useState } from "react";
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
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
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
  projectId,
  salesforceConfigured,
  salesforceStatus,
}: {
  connections: ConnectionListItem[];
  organizationId: string;
  projectId: string;
  salesforceConfigured: boolean;
  salesforceStatus?: string | null;
}) {
  const [view, setView] = useState<CollectionView>(DEFAULT_VIEW);
  const [query, setQuery] = useState("");
  const [connecting, setConnecting] = useState(
    salesforceStatus === "expired",
  );
  const [platform, setPlatform] = useState("SALESFORCE");
  const [filters, setFilters] = useState<ConnectionFilters>(
    emptyConnectionFilters,
  );
  const connectHref = `/api/connectors/salesforce/start?organizationId=${organizationId}&projectId=${projectId}&returnTo=/projects/${projectId}/connections`;

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
  const loaded = useLoadMore(
    visible,
    `${query}|${JSON.stringify(filters)}`,
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="mt-1 text-sm text-muted">
            Environments available to this project. Connect a platform here,
            then attach it.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
          <button
            type="button"
            className={buttonClassName("primary", "gap-1")}
            onClick={() => setConnecting(true)}
          >
            <span aria-hidden="true">+</span>
            Connect
          </button>
        </div>
      </div>
      {salesforceStatus === "connected" ? (
        <p className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
          Salesforce is connected and attached to this project.
        </p>
      ) : null}
      {salesforceStatus === "error" ? (
        <p className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
          Salesforce could not be connected. Try again from this page.
        </p>
      ) : null}
      {salesforceStatus === "not-configured" ? (
        <p className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
          Salesforce OAuth is not configured on this environment.
        </p>
      ) : null}
      {salesforceStatus === "expired" ? (
        <p className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
          Salesforce access expired. Click Connect Salesforce and sign in again.
          Attach or Remove will not fix this.
        </p>
      ) : null}
      {connecting ? (
        <div className="mb-4 rounded-md border border-border bg-background p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Connect a platform</h2>
              <p className="mt-1 text-sm text-muted">
                Enigma inventories objects and fields. It does not pull customer
                records.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-muted hover:text-foreground"
              onClick={() => setConnecting(false)}
            >
              Cancel
            </button>
          </div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="connect-platform">
            Platform
          </label>
          <select
            id="connect-platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="h-9 w-full max-w-sm rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground"
          >
            <option value="SALESFORCE">Salesforce</option>
            <option value="PEGA" disabled>
              Pega (coming soon)
            </option>
            <option value="SERVICENOW" disabled>
              ServiceNow (coming soon)
            </option>
            <option value="MICROSOFT" disabled>
              Microsoft (coming soon)
            </option>
          </select>
          {!salesforceConfigured ? (
            <p className="mt-3 text-sm text-muted">
              Add the Salesforce Connected App keys and TOKEN_ENCRYPTION_KEY on
              this host, then click Connect. You will sign in to Salesforce and
              return here.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              You will be sent to Salesforce to approve access, then returned
              to this project.
            </p>
          )}
          <div className="mt-4">
            <a href={connectHref} className={buttonClassName()}>
              Connect Salesforce
            </a>
          </div>
        </div>
      ) : null}
      {connections.length === 0 && !connecting ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium">No environments yet</p>
          <p className="mt-1 text-sm text-muted">
            Connect Salesforce from this page, then attach the environment to
            the project.
          </p>
          <div className="mt-3">
            <button
              type="button"
              className={buttonClassName()}
              onClick={() => setConnecting(true)}
            >
              Connect
            </button>
          </div>
        </div>
      ) : visible.length === 0 && connections.length > 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No connections match that search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {loaded.items.map((connection) => (
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Environment</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Instance</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium">Last activity</th>
                <th className="py-2 pl-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loaded.items.map((connection) => (
                <tr
                  key={connection.id}
                  className="border-b border-border hover:bg-surface-2"
                >
                  <td className="py-2.5 pr-3 font-medium">{connection.name}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {platformLabel(connection.platformType)}
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {connection.externalOrgId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ConnectionStatusMark status={connection.status} />
                      <span className="text-muted">
                        {connectionLabel(connection.status)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {connection.attached ? "Attached" : "Not attached"}
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {formatLastActivity(connection.updatedAt)}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
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
      <LoadMoreButton hasMore={loaded.hasMore} onLoadMore={loaded.loadMore} />
    </div>
  );
}
