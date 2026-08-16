"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createProjectSchema, type AuthFormState } from "@/lib/validations/auth";
import { getAccount } from "@/server/services/accounts";
import { createProject } from "@/server/services/projects";

export async function createProjectAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    platformType: formData.get("platformType"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const organization = await getAccount(
    session.tenantId,
    parsed.data.organizationId,
  );

  if (!organization) {
    return { errors: { organizationId: ["Choose a customer account."] } };
  }

  const project = await createProject({
    tenantId: session.tenantId,
    userId: session.userId,
    name: parsed.data.name,
    platformType: parsed.data.platformType,
    organizationId: organization.id,
  });

  redirect(`/projects/${project.id}`);
}
