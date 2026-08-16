import { sql } from "@/lib/db/sql";
import type { TenantRow, UserRow } from "@/lib/db/types";
import { requireTenantId } from "@/lib/tenants/scope";

export async function findUserById(userId: string) {
  const [user] = await sql<Pick<UserRow, "id" | "tenantId" | "role">[]>`
    select id, "tenantId", role
    from "User"
    where id = ${userId}
    limit 1
  `;

  return user ?? null;
}

export async function findUserByEmail(email: string) {
  const [user] = await sql<Pick<UserRow, "id">[]>`
    select id
    from "User"
    where email = ${email}
    limit 1
  `;

  return user ?? null;
}

export async function getUserProfile(tenantId: string, userId: string) {
  const [user] = await sql<
    Pick<UserRow, "name" | "avatarPath" | "selectedOrganizationId">[]
  >`
    select name, "avatarPath", "selectedOrganizationId"
    from "User"
    where id = ${userId} and "tenantId" = ${requireTenantId(tenantId)}
    limit 1
  `;

  return user ?? null;
}

export async function setSelectedOrganizationId(
  tenantId: string,
  userId: string,
  organizationId: string,
) {
  const scoped = requireTenantId(tenantId);
  const updated = await sql`
    update "User"
    set "selectedOrganizationId" = ${organizationId}, "updatedAt" = now()
    where id = ${userId}
      and "tenantId" = ${scoped}
      and exists (
        select 1
        from "Organization"
        where id = ${organizationId} and "tenantId" = ${scoped}
      )
  `;

  return updated.count;
}

export async function getUserAvatarPath(tenantId: string, userId: string) {
  const [user] = await sql<Pick<UserRow, "avatarPath">[]>`
    select "avatarPath"
    from "User"
    where id = ${userId} and "tenantId" = ${requireTenantId(tenantId)}
    limit 1
  `;

  return user ?? null;
}

export async function setUserAvatarPath(
  tenantId: string,
  userId: string,
  avatarPath: string | null,
) {
  const updated = await sql`
    update "User"
    set "avatarPath" = ${avatarPath}, "updatedAt" = now()
    where id = ${userId} and "tenantId" = ${requireTenantId(tenantId)}
  `;

  return updated.count;
}

export async function getTenant(tenantId: string) {
  const [tenant] = await sql<Pick<TenantRow, "id" | "name" | "slug">[]>`
    select id, name, slug
    from "Tenant"
    where id = ${tenantId}
    limit 1
  `;

  return tenant ?? null;
}
