"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { slugifyTenantName, uniqueSlug } from "@/lib/tenants/slug";
import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/validations/auth";
import { writeAuditLog } from "@/server/services/audit";

export async function signup(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    tenantName: formData.get("tenantName"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, tenantName } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const baseSlug = slugifyTenantName(tenantName);
  const colliding = await prisma.tenant.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = uniqueSlug(
    baseSlug,
    colliding.map((tenant) => tenant.slug),
  );

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug,
      users: {
        create: {
          name,
          email,
          passwordHash: await hashPassword(password),
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];

  await writeAuditLog({
    tenantId: tenant.id,
    userId: user.id,
    action: "tenant.create",
    entity: "Tenant",
    entityId: tenant.id,
    metadata: { slug },
  });

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { message: "Email or password is incorrect." };
  }

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
