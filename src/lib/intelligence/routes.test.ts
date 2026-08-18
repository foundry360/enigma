import { describe, expect, it } from "vitest";
import { intelligenceHref } from "@/lib/intelligence/routes";

describe("intelligence routes", () => {
  it("builds overview and tab paths", () => {
    expect(intelligenceHref("proj-1")).toBe("/projects/proj-1/intelligence");
    expect(intelligenceHref("proj-1", "opportunities")).toBe(
      "/projects/proj-1/intelligence/opportunities",
    );
    expect(
      intelligenceHref("proj-1", "opportunities", { candidate: "c1" }),
    ).toBe("/projects/proj-1/intelligence/opportunities?candidate=c1");
  });
});
