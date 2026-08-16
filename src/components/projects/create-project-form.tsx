"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { platformLabels, projectPlatforms } from "@/lib/platforms";

export function CreateProjectForm({
  accounts,
  selectedAccountId,
}: {
  accounts: { id: string; name: string }[];
  selectedAccountId?: string | null;
}) {
  const [state, action, pending] = useActionState(
    createProjectAction,
    undefined,
  );

  return (
    <form action={action} className="max-w-lg space-y-4">
      <Field
        label="Project name"
        name="name"
        placeholder="Agentforce opportunity assessment"
        error={state?.errors?.name}
      />
      <SelectField
        label="Platform"
        name="platformType"
        defaultValue="SALESFORCE"
        error={state?.errors?.platformType}
      >
        {projectPlatforms.map((platform) => (
          <option key={platform} value={platform}>
            {platformLabels[platform]}
          </option>
        ))}
      </SelectField>
      {accounts.length > 1 ? (
        <SelectField
          label="Account"
          name="organizationId"
          defaultValue={selectedAccountId ?? accounts[0]?.id}
          error={state?.errors?.organizationId}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <input
          type="hidden"
          name="organizationId"
          value={selectedAccountId ?? accounts[0]?.id ?? ""}
        />
      )}
      {state?.message ? (
        <p className="text-sm text-accent">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating project…" : "Create project"}
      </Button>
    </form>
  );
}
