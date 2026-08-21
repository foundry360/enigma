import { describe, expect, it } from "vitest";
import { discoveryCoverage } from "@/modules/intelligence/summarize";

describe("discovery coverage", () => {
  it("is complete when objects listed and most describes succeeded", () => {
    expect(
      discoveryCoverage([
        { tool: "list_objects", ok: true },
        { tool: "describe_object", ok: true },
        { tool: "describe_object", ok: true },
        { tool: "describe_object", ok: false },
      ]).complete,
    ).toBe(true);
  });

  it("is incomplete when objects were not listed or most describes failed", () => {
    expect(
      discoveryCoverage([
        { tool: "describe_object", ok: true },
      ]).complete,
    ).toBe(false);
    expect(
      discoveryCoverage([
        { tool: "list_objects", ok: true },
        { tool: "describe_object", ok: false },
        { tool: "describe_object", ok: false },
        { tool: "describe_object", ok: true },
      ]).complete,
    ).toBe(false);
  });
});
