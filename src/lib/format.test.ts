import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLastActivity,
  formatTimeAgo,
  toUtcDate,
} from "@/lib/format";

describe("toUtcDate", () => {
  it("treats naive postgres timestamps as UTC", () => {
    expect(toUtcDate("2026-08-18 03:00:30.185").toISOString()).toBe(
      "2026-08-18T03:00:30.185Z",
    );
  });
});

describe("formatDate", () => {
  it("prints calendar dates as mm/dd/yyyy", () => {
    expect(formatDate("2026-08-19")).toBe("08/19/2026");
    expect(formatDate("2026-08-20T18:11:32.000Z")).toBe("08/20/2026");
    expect(formatDate(new Date("2026-08-20T23:15:00.000Z"))).toBe("08/20/2026");
    expect(formatDate("2026-08-20 22:15:43.123+00")).toBe("08/20/2026");
  });
});

describe("formatDateTime", () => {
  it("prints the same mm/dd/yyyy calendar date without a time", () => {
    expect(formatDateTime("2026-08-19T15:04:00Z")).toBe("08/19/2026");
  });
});

describe("formatLastActivity", () => {
  it("prints mm/dd/yyyy even for activity from today", () => {
    expect(formatLastActivity("2026-08-20T18:11:32.000Z")).toBe("08/20/2026");
    expect(formatLastActivity(new Date())).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("formatCurrency", () => {
  it("prints dollars with thousands separators", () => {
    expect(formatCurrency(2700)).toBe("$2,700");
    expect(formatCurrency(1_500_000)).toBe("$1,500,000");
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
