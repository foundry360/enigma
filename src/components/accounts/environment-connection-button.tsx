import { disconnectSalesforceAction } from "@/app/actions/connections";
import { Button, buttonClassName } from "@/components/ui/button";

export function EnvironmentConnectionButton({
  organizationId,
  connectionId,
  connected,
}: {
  organizationId: string;
  connectionId: string;
  connected: boolean;
}) {
  if (connected) {
    return (
      <form action={disconnectSalesforceAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="connectionId" value={connectionId} />
        <Button type="submit" variant="outline">
          Disconnect
        </Button>
      </form>
    );
  }

  return (
    <a
      href={`/api/connectors/salesforce/start?organizationId=${organizationId}&returnTo=/accounts/${organizationId}`}
      className={buttonClassName("primary")}
    >
      Connect
    </a>
  );
}
