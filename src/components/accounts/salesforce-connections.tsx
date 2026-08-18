import Link from "next/link";
import { disconnectSalesforceAction } from "@/app/actions/connections";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  ConnectionStatusMark,
  connectionLabel,
} from "@/components/ui/status-dot";
import { formatLastActivity } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";

export function SalesforceConnections({
  organizationId,
  configured,
  connections,
}: {
  organizationId: string;
  configured: boolean;
  connections: {
    id: string;
    platformType: string;
    status: string;
    externalOrgId: string | null;
    externalOrgName: string | null;
    updatedAt: Date | string;
  }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {configured ? (
          <Link
            href={`/api/connectors/salesforce/start?organizationId=${organizationId}&returnTo=/accounts/${organizationId}/platforms`}
            className={buttonClassName("primary", "gap-1")}
          >
            <span aria-hidden="true">+</span>
            Connect Salesforce
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Salesforce OAuth is not configured on this environment.
          </p>
        )}
      </div>
      {connections.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
          No platforms connected. Connect a Salesforce Developer Org or sandbox
          to inventory objects and fields — not customer records.
        </p>
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
                <p className="mt-0.5 text-xs text-muted">
                  {connection.externalOrgId ?? "No org id yet"}
                  {" · "}
                  Last activity {formatLastActivity(connection.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <ConnectionStatusMark status={connection.status} />
                  <span className="text-muted">
                    {connectionLabel(connection.status)}
                  </span>
                </span>
                {connection.status === "CONNECTED" ? (
                  <form action={disconnectSalesforceAction}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organizationId}
                    />
                    <input
                      type="hidden"
                      name="connectionId"
                      value={connection.id}
                    />
                    <Button type="submit" variant="secondary">
                      Disconnect
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
