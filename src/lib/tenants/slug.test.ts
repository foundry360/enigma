import { describe, expect, it } from "vitest";
import { slugifyTenantName, uniqueSlug } from "@/lib/tenants/slug";

describe("tenant slugs", () => {
  it("normalizes workspace names", () => {
    expect(slugifyTenantName(" West Region AEs ")).toBe("west-region-aes");
  });

  it("avoids collisions", () => {
    expect(uniqueSlug("acme", ["acme", "acme-2"])).toBe("acme-3");
    expect(uniqueSlug("acme", ["other"])).toBe("acme");
  });
});
