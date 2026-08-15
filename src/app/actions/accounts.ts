"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createAccountSchema, type AuthFormState } from "@/lib/validations/auth";
import { createAccount } from "@/server/services/accounts";

export async function createAccountAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await createAccount({
    tenantId: session.tenantId,
    userId: session.userId,
    name: parsed.data.name,
    industry: parsed.data.industry,
  });

  redirect("/accounts");
}
