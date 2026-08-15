"use client";

import { useActionState } from "react";
import { createAccountAction } from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccountAction, undefined);

  return (
    <form action={action} className="max-w-lg space-y-4">
      <Field
        label="Customer account name"
        name="name"
        placeholder="Northern Peak Financial"
        error={state?.errors?.name}
      />
      <Field
        label="Industry"
        name="industry"
        placeholder="Financial services"
        error={state?.errors?.industry}
      />
      {state?.message ? <p className="text-sm text-risk">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding account…" : "Add account"}
      </Button>
    </form>
  );
}
