import { describe, expect, it } from "vitest";
import { formatTimeAgo, toUtcDate } from "@/lib/format";

describe("toUtcDate", () => {
  it("treats naive postgres timestamps as UTC", () => {
    expect(toUtcDate("2026-08-18 03:00:30.185").toISOString()).toBe(
      "2026-08-18T03:00:30.185Z",
    );
  });
});

describe("formatTimeAgo", () => {
  it("uses minutes and hours before days", () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 45_000))).toBe("Just now");
    expect(formatTimeAgo(new Date(now - 5 * 60_000))).toBe("5 mins ago");
    expect(formatTimeAgo(new Date(now - 2 * 60 * 60_000))).toBe("2 hours ago");
    expect(formatTimeAgo(new Date(now - 26 * 60 * 60_000))).toBe("1 day ago");
  });
});
