"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createAccountSchema, type AuthFormState } from "@/lib/validations/auth";
import {
  createAccount,
  deleteAccount,
  getAccount,
  setOrganizationDisabled,
  updateAccount,
} from "@/server/services/accounts";
import { setSelectedOrganizationId } from "@/server/services/users";

export async function createAccountAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    organizationType: formData.get("organizationType") || undefined,
    employeeRange: formData.get("employeeRange") || undefined,
    primaryContact: formData.get("primaryContact") || undefined,
    customerStatus: formData.get("customerStatus") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const organization = await createAccount({
    tenantId: session.tenantId,
    userId: session.userId,
    name: parsed.data.name,
    industry: parsed.data.industry,
    organizationType: parsed.data.organizationType,
    employeeRange: parsed.data.employeeRange,
    primaryContact: parsed.data.primaryContact,
    customerStatus: parsed.data.customerStatus,
  });

  await setSelectedOrganizationId(
    session.tenantId,
    session.userId,
    organization.id,
  );

  revalidatePath("/", "layout");
  redirect(`/accounts/${organization.id}`);
}

export async function selectAccountAction(organizationId: string) {
  const session = await requireSession();
  const updated = await setSelectedOrganizationId(
    session.tenantId,
    session.userId,
    organizationId,
  );

  if (!updated) {
    return { message: "Account not found." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearSelectedOrganizationAction() {
  const session = await requireSession();
  await setSelectedOrganizationId(session.tenantId, session.userId, null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccountAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const organizationId = String(formData.get("organizationId") ?? "");
  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    organizationType: formData.get("organizationType") || undefined,
    employeeRange: formData.get("employeeRange") || undefined,
    primaryContact: formData.get("primaryContact") || undefined,
    customerStatus: formData.get("customerStatus") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const organization = await updateAccount({
    tenantId: session.tenantId,
    userId: session.userId,
    organizationId,
    name: parsed.data.name,
    industry: parsed.data.industry,
    organizationType: parsed.data.organizationType,
    employeeRange: parsed.data.employeeRange,
    primaryContact: parsed.data.primaryContact,
    customerStatus: parsed.data.customerStatus,
  });

  if (!organization) {
    return { message: "Organization not found." };
  }

  revalidatePath("/", "layout");
  redirect(`/accounts/${organization.id}`);
}

export async function disableOrganizationAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = String(formData.get("organizationId") ?? "");
  const disabled = String(formData.get("disabled") ?? "") === "true";
  const updated = await setOrganizationDisabled({
    tenantId: session.tenantId,
    userId: session.userId,
    organizationId,
    disabled,
  });

  if (!updated) {
    redirect("/accounts");
  }

  revalidatePath("/", "layout");
  redirect(`/accounts/${updated.id}/settings`);
}

export async function deleteOrganizationAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = String(formData.get("organizationId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  const organization = await getAccount(session.tenantId, organizationId);

  if (!organization) {
    redirect("/accounts");
  }

  if (confirmName !== organization.name) {
    redirect(`/accounts/${organization.id}/settings`);
  }

  await deleteAccount({
    tenantId: session.tenantId,
    userId: session.userId,
    organizationId,
  });

  revalidatePath("/", "layout");
  redirect("/accounts");
}
