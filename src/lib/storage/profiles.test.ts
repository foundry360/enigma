import { describe, expect, it } from "vitest";
import { TenantAccessError } from "@/lib/tenants/errors";
import {
  avatarExtensionForType,
  isAvatarMimeType,
  profileObjectPath,
} from "@/lib/storage/profiles";

describe("profile storage paths", () => {
  it("scopes the object key with tenantId", () => {
    expect(profileObjectPath("tenant_a", "user_1", "jpg")).toBe(
      "tenant_a/user_1/avatar.jpg",
    );
  });

  it("rejects a missing tenant id", () => {
    expect(() => profileObjectPath("", "user_1", "jpg")).toThrow(
      TenantAccessError,
    );
  });

  it("accepts only image types", () => {
    expect(isAvatarMimeType("image/png")).toBe(true);
    expect(isAvatarMimeType("application/pdf")).toBe(false);
    expect(avatarExtensionForType("image/webp")).toBe("webp");
    expect(avatarExtensionForType("text/plain")).toBeNull();
  });
});
