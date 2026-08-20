import { describe, expect, it } from "vitest";
import {
  assertAllowedSalesforcePath,
  assertSafeObjectApiName,
  restQueries,
  salesforcePath,
  toolingQueries,
} from "@/modules/connectors/salesforce/paths";

describe("Salesforce path allowlist", () => {
  it("allows describe for a valid object API name", () => {
    expect(salesforcePath("describe", "Case")).toBe(
      "/services/data/v61.0/sobjects/Case/describe",
    );
    expect(() =>
      assertAllowedSalesforcePath("/services/data/v61.0/sobjects/Case/describe"),
    ).not.toThrow();
  });

  it("rejects record queries and unsafe object names", () => {
    expect(() => assertSafeObjectApiName("Case/describe;SELECT")).toThrow();
    expect(() =>
      assertAllowedSalesforcePath("/services/data/v61.0/query"),
    ).toThrow();
    expect(() =>
      assertAllowedSalesforcePath("/services/data/v61.0/sobjects/Account/"),
    ).toThrow();
  });

  it("only allows catalogued Tooling queries", () => {
    expect(() =>
      salesforcePath("tooling", "SELECT Id FROM Account"),
    ).toThrow();
    expect(() =>
      salesforcePath("tooling", toolingQueries.apexTriggers),
    ).not.toThrow();
    expect(() =>
      salesforcePath("tooling", toolingQueries.profiles),
    ).not.toThrow();
    expect(() =>
      salesforcePath("tooling", toolingQueries.permissionSets),
    ).not.toThrow();
    expect(() =>
      salesforcePath("tooling", toolingQueries.assignmentRules),
    ).not.toThrow();
    expect(() =>
      salesforcePath("tooling", toolingQueries.entitySharing),
    ).not.toThrow();
    expect(() =>
      salesforcePath("query", restQueries.flowDefinitionView),
    ).not.toThrow();
    expect(() =>
      salesforcePath("query", restQueries.namedCredentials),
    ).not.toThrow();
    expect(() =>
      salesforcePath("query", restQueries.queues),
    ).not.toThrow();
    expect(() =>
      assertAllowedSalesforcePath(
        `/services/data/v61.0/tooling/query?q=${encodeURIComponent("SELECT Id FROM Account")}`,
      ),
    ).toThrow();
  });

  it("allows the Organization identity query and rejects other REST queries", () => {
    const path = salesforcePath("query", restQueries.organization);
    expect(path).toContain("/services/data/v61.0/query?q=");
    expect(() => assertAllowedSalesforcePath(path)).not.toThrow();
    expect(() =>
      salesforcePath("query", "SELECT Id, Name FROM Account LIMIT 1"),
    ).toThrow();
    expect(() =>
      assertAllowedSalesforcePath(
        `/services/data/v61.0/query?q=${encodeURIComponent("SELECT Id, Name FROM Account")}`,
      ),
    ).toThrow();
  });
});
