"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createProjectSchema, type AuthFormState } from "@/lib/validations/auth";
import { getAccount } from "@/server/services/accounts";
import {
  createProject,
  deleteProject,
  getProject,
  getProjectForEdit,
  setProjectEnvironment,
  updateProject,
} from "@/server/services/projects";
import { listTenantUsers } from "@/server/services/users";

function formList(formData: FormData, name: string) {
  return formData.getAll(name).map(String).filter(Boolean);
}

function optionalText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

function optionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) {
    return undefined;
  }

  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function optionalPercent(formData: FormData, name: string) {
  const value = optionalNumber(formData, name);
  return value == null ? undefined : value / 100;
}

export async function createProjectAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId"),
    projectType: formData.get("projectType") || undefined,
    objective: formData.get("objective"),
    outcomes: formList(formData, "outcomes"),
    outcomeOther: optionalText(formData, "outcomeOther"),
    ownerId: formData.get("ownerId"),
    status: formData.get("status") || undefined,
    platforms: formList(formData, "platforms"),
    environmentIds: formList(formData, "environmentIds"),
    description: optionalText(formData, "description"),
    businessUnit: optionalText(formData, "businessUnit"),
    department: optionalText(formData, "department"),
    executiveSponsor: optionalText(formData, "executiveSponsor"),
    customerLead: optionalText(formData, "customerLead"),
    targetDate: optionalText(formData, "targetDate"),
    priority: optionalText(formData, "priority"),
    successMetrics: optionalText(formData, "successMetrics"),
    notes: optionalText(formData, "notes"),
    implementationCost: optionalNumber(formData, "implementationCost"),
    discoveryCost: optionalNumber(formData, "discoveryCost"),
    knowledgeCost: optionalNumber(formData, "knowledgeCost"),
    changeManagementCost: optionalNumber(formData, "changeManagementCost"),
    servicesCost: optionalNumber(formData, "servicesCost"),
    otherCost: optionalNumber(formData, "otherCost"),
    annualVolume: optionalNumber(formData, "annualVolume"),
    unitPrice: optionalNumber(formData, "unitPrice"),
    hoursSavedPerUnit: optionalNumber(formData, "hoursSavedPerUnit"),
    hourlyCost: optionalNumber(formData, "hourlyCost"),
    conservativeAdoption: optionalPercent(formData, "conservativeAdoption"),
    expectedAdoption: optionalPercent(formData, "expectedAdoption"),
    aggressiveAdoption: optionalPercent(formData, "aggressiveAdoption"),
    baselineDays: optionalNumber(formData, "baselineDays"),
    enigmaDays: optionalNumber(formData, "enigmaDays"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [organization, owners] = await Promise.all([
    getAccount(session.tenantId, parsed.data.organizationId),
    listTenantUsers(session.tenantId),
  ]);

  if (!organization) {
    return { errors: { organizationId: ["Choose an organization."] } };
  }

  if (!owners.some((user) => user.id === parsed.data.ownerId)) {
    return { errors: { ownerId: ["Choose a project owner."] } };
  }

  const project = await createProject({
    tenantId: session.tenantId,
    userId: session.userId,
    ...parsed.data,
  });

  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId"),
    projectType: formData.get("projectType") || undefined,
    objective: formData.get("objective"),
    outcomes: formList(formData, "outcomes"),
    outcomeOther: optionalText(formData, "outcomeOther"),
    ownerId: formData.get("ownerId"),
    status: formData.get("status") || undefined,
    platforms: formList(formData, "platforms"),
    description: optionalText(formData, "description"),
    businessUnit: optionalText(formData, "businessUnit"),
    department: optionalText(formData, "department"),
    executiveSponsor: optionalText(formData, "executiveSponsor"),
    customerLead: optionalText(formData, "customerLead"),
    targetDate: optionalText(formData, "targetDate"),
    priority: optionalText(formData, "priority"),
    successMetrics: optionalText(formData, "successMetrics"),
    notes: optionalText(formData, "notes"),
    implementationCost: optionalNumber(formData, "implementationCost"),
    discoveryCost: optionalNumber(formData, "discoveryCost"),
    knowledgeCost: optionalNumber(formData, "knowledgeCost"),
    changeManagementCost: optionalNumber(formData, "changeManagementCost"),
    servicesCost: optionalNumber(formData, "servicesCost"),
    otherCost: optionalNumber(formData, "otherCost"),
    annualVolume: optionalNumber(formData, "annualVolume"),
    unitPrice: optionalNumber(formData, "unitPrice"),
    hoursSavedPerUnit: optionalNumber(formData, "hoursSavedPerUnit"),
    hourlyCost: optionalNumber(formData, "hourlyCost"),
    conservativeAdoption: optionalPercent(formData, "conservativeAdoption"),
    expectedAdoption: optionalPercent(formData, "expectedAdoption"),
    aggressiveAdoption: optionalPercent(formData, "aggressiveAdoption"),
    baselineDays: optionalNumber(formData, "baselineDays"),
    enigmaDays: optionalNumber(formData, "enigmaDays"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const owners = await listTenantUsers(session.tenantId);

  if (!owners.some((user) => user.id === parsed.data.ownerId)) {
    return { errors: { ownerId: ["Choose a project owner."] } };
  }

  const project = await updateProject({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
    ...parsed.data,
  });

  if (!project) {
    return { message: "Project not found." };
  }

  revalidatePath("/", "layout");
  if (String(formData.get("fromModal") ?? "") === "1") {
    return { ok: true };
  }

  redirect(`/projects/${project.id}/settings`);
}

export async function getProjectForEditAction(projectId: string) {
  const session = await requireSession();
  return getProjectForEdit(session.tenantId, projectId);
}

export async function setProjectEnvironmentAction(formData: FormData) {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const connectionId = String(formData.get("connectionId") ?? "");
  const attached = String(formData.get("attached") ?? "") === "true";
  const updated = await setProjectEnvironment({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
    connectionId,
    attached,
  });

  if (!updated) {
    redirect("/dashboard");
  }

  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}/connections`);
}

export async function deleteProjectAction(formData: FormData) {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  const project = await getProject(session.tenantId, projectId);

  if (!project) {
    redirect("/dashboard");
  }

  if (confirmName !== project.name) {
    const returnTo = String(formData.get("returnTo") ?? "").trim();
    redirect(returnTo || `/projects/${project.id}/settings`);
  }

  await deleteProject({
    tenantId: session.tenantId,
    userId: session.userId,
    projectId,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
