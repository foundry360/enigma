import { describe, expect, it } from "vitest";
import {
  discoveryToolLabel,
  isMcpToolName,
  mcpTools,
} from "@/modules/mcp/catalog";

describe("MCP catalog", () => {
  it("exposes the metadata-only tool set", () => {
    expect(mcpTools).toContain("list_objects");
    expect(mcpTools).toContain("describe_object");
    expect(mcpTools).not.toContain("query_records");
    expect(mcpTools).not.toContain("soql");
  });

  it("rejects unknown tools", () => {
    expect(isMcpToolName("list_objects")).toBe(true);
    expect(isMcpToolName("run_soql")).toBe(false);
  });

  it("renders discovery tools as words, not field names", () => {
    expect(discoveryToolLabel("get_connection")).toBe("Get Connection");
    expect(discoveryToolLabel("list_validation_rules")).toBe(
      "List Validation Rules",
    );
  });
});
