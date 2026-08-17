import { describe, expect, it } from "vitest";
import { isWorkspaceSigned } from "@/lib/layout/sidebar";

describe("isWorkspaceSigned", () => {
  it("hides workspace chrome on the organization list", () => {
    expect(isWorkspaceSigned("/accounts", "org-1")).toBe(false);
  });

  it("hides workspace chrome when no organization is selected", () => {
    expect(isWorkspaceSigned("/dashboard", null)).toBe(false);
  });

  it("shows workspace chrome after an organization is selected", () => {
    expect(isWorkspaceSigned("/accounts/org-1", "org-1")).toBe(true);
    expect(isWorkspaceSigned("/dashboard", "org-1")).toBe(true);
  });
});
