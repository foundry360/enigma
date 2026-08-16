"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        error={state?.errors?.name}
      />
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        error={state?.errors?.email}
      />
      <Field
        label="Partner org name"
        name="tenantName"
        placeholder="Acme Partner"
        error={state?.errors?.tenantName}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state?.errors?.password}
        hint="At least 8 characters, with a letter and a number."
      />
      {state?.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating partner org…" : "Create partner org"}
      </Button>
    </form>
  );
}
