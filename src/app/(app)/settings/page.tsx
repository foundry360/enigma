import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsRow } from "@/components/ui/settings-row";
import { requireSession } from "@/lib/auth/session";
import { isSalesforceConfigured } from "@/modules/connectors/salesforce";
import { getProfileAvatarUrl } from "@/server/services/profile";
import { getTenant, getUserProfile } from "@/server/services/users";

export default async function SettingsPage() {
  const session = await requireSession();
  const [tenant, user] = await Promise.all([
    getTenant(session.tenantId),
    getUserProfile(session.tenantId, session.userId),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Partner org, profile, and connection details."
      />
      <div className="divide-y divide-border rounded-md border border-border bg-surface">
        <SettingsRow title="Profile" description="Shown in the sidebar.">
          <AvatarUpload
            name={user?.name ?? "User"}
            imageUrl={await getProfileAvatarUrl(user?.avatarPath)}
          />
        </SettingsRow>
        <SettingsRow title="Partner org">
          <p className="text-sm font-medium">{tenant?.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{tenant?.slug}</p>
        </SettingsRow>
        <SettingsRow title="Appearance" description="Saved in this browser.">
          <ThemeToggle />
        </SettingsRow>
        <SettingsRow title="Authentication">
          <p className="text-sm">Supabase Auth</p>
          <p className="mt-1 text-xs text-muted">
            Email and password are verified by Supabase. Tenant membership stays
            on the server.
          </p>
        </SettingsRow>
        <SettingsRow title="Database">
          <p className="text-sm">Supabase Postgres</p>
          <p className="mt-0.5 font-mono text-xs text-muted">
            ppceqvoyexpkguzeseen · us-east-2
          </p>
        </SettingsRow>
        <SettingsRow title="Salesforce">
          <p className="text-sm">
            {isSalesforceConfigured() ? "Connected App configured" : "Not configured"}
          </p>
          <p className="mt-1 text-xs text-muted">
            OAuth uses a Connected App and a server-side callback. Tokens never
            reach the browser.
          </p>
        </SettingsRow>
      </div>
    </>
  );
}
