"use client";

import { useActionState } from "react";
import { updateAccountAction } from "@/app/actions/accounts";
import { OrganizationProfileFields } from "@/components/accounts/organization-profile-fields";
import { Button } from "@/components/ui/button";

export function EditAccountForm({
  organizationId,
  name,
  industry,
  organizationType,
  employeeRange,
  primaryContact,
  customerStatus,
}: {
  organizationId: string;
  name: string;
  industry: string | null;
  organizationType: string | null;
  employeeRange: string | null;
  primaryContact: string | null;
  customerStatus: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateAccountAction,
    undefined,
  );

  return (
    <form action={action} className="max-w-lg space-y-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <OrganizationProfileFields
        defaults={{
          name,
          industry,
          organizationType,
          employeeRange,
          primaryContact,
          customerStatus,
        }}
        errors={state?.errors}
      />
      {state?.message ? (
        <p className="text-sm text-accent">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save organization"}
      </Button>
    </form>
  );
}
