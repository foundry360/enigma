import { describe, expect, it } from "vitest";
import { TenantAccessError } from "@/lib/tenants/errors";
import {
  assertSameTenant,
  requireTenantId,
  scopedCreate,
  tenantWhere,
} from "@/lib/tenants/scope";

describe("tenant isolation helpers", () => {
  it("requires a tenant id", () => {
    expect(() => requireTenantId(undefined)).toThrow(TenantAccessError);
    expect(requireTenantId("tenant_a")).toBe("tenant_a");
  });

  it("always scopes queries by tenantId", () => {
    expect(tenantWhere("tenant_a")).toEqual({ tenantId: "tenant_a" });
  });

  it("stamps tenantId onto creates and rejects spoofed ids", () => {
    expect(scopedCreate("tenant_a", { name: "Northwind" })).toEqual({
      name: "Northwind",
      tenantId: "tenant_a",
    });

    expect(() =>
      scopedCreate("tenant_a", { name: "Northwind", tenantId: "tenant_b" }),
    ).toThrow(TenantAccessError);
  });

  it("rejects cross-tenant record access", () => {
    expect(() => assertSameTenant("tenant_b", "tenant_a")).toThrow(
      TenantAccessError,
    );
    expect(() => assertSameTenant("tenant_a", "tenant_a")).not.toThrow();
  });
});
