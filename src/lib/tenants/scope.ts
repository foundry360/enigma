import { TenantAccessError } from "@/lib/tenants/errors";

export function requireTenantId(tenantId: string | undefined | null): string {
  if (!tenantId) {
    throw new TenantAccessError("A tenant context is required");
  }

  return tenantId;
}

export function tenantWhere(tenantId: string) {
  return { tenantId: requireTenantId(tenantId) };
}

export function scopedCreate<T extends object>(tenantId: string, data: T) {
  const incoming = data as Record<string, unknown>;

  if ("tenantId" in incoming && incoming.tenantId !== tenantId) {
    throw new TenantAccessError("Cannot assign a record to another tenant");
  }

  return { ...data, tenantId: requireTenantId(tenantId) };
}

export function assertSameTenant(
  recordTenantId: string,
  sessionTenantId: string,
) {
  if (recordTenantId !== sessionTenantId) {
    throw new TenantAccessError();
  }
}
