import { createId, sql } from "@/lib/db/sql";
import type { TenantRow, UserRow } from "@/lib/db/types";
import { slugifyTenantName, uniqueSlug } from "@/lib/tenants/slug";
import { writeAuditLog } from "@/server/services/audit";

export async function createWorkspaceForAuthUser(input: {
  authUserId: string;
  name: string;
  email: string;
  tenantName: string;
}) {
  const baseSlug = slugifyTenantName(input.tenantName);
  const colliding = await sql<Pick<TenantRow, "slug">[]>`
    select slug
    from "Tenant"
    where slug like ${`${baseSlug}%`}
  `;
  const slug = uniqueSlug(
    baseSlug,
    colliding.map((tenant) => tenant.slug),
  );

  const tenantId = createId();

  const tenant = await sql.begin(async (tx) => {
    const [created] = await tx<TenantRow[]>`
      insert into "Tenant" (id, name, slug, "createdAt", "updatedAt")
      values (${tenantId}, ${input.tenantName}, ${slug}, now(), now())
      returning *
    `;

    await tx<UserRow[]>`
      insert into "User" (
        id, "tenantId", email, name, role, "createdAt", "updatedAt"
      )
      values (
        ${input.authUserId},
        ${tenantId},
        ${input.email},
        ${input.name},
        'ADMIN',
        now(),
        now()
      )
    `;

    return created;
  });

  const user = {
    id: input.authUserId,
    tenantId,
    name: input.name,
    email: input.email,
    role: "ADMIN" as const,
  };

  await writeAuditLog({
    tenantId: tenant.id,
    userId: user.id,
    action: "tenant.create",
    entity: "Tenant",
    entityId: tenant.id,
    metadata: { slug },
  });

  return { tenant, user };
}
