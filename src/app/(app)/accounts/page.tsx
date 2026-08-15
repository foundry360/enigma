import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { listAccounts } from "@/server/services/accounts";

export default async function AccountsPage() {
  const session = await requireSession();
  const accounts = await listAccounts(session.tenantId);

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Customer environments"
        description="Each account is a company you may assess. Salesforce orgs attach here as platform connections — not as the core data model."
        actions={
          <Link href="/accounts/new" className={buttonClassName()}>
            Add account
          </Link>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body="Create the customer you want to take through Connect → Discover → Assess → Value."
          action={
            <Link href="/accounts/new" className={buttonClassName()}>
              Add the first account
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-border bg-surface">
                  <td className="px-4 py-3">{account.name}</td>
                  <td className="px-4 py-3 text-muted">{account.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge>
                      {account.connections[0]?.status ?? "Not connected"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {account.assessments[0]?.status ?? "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
