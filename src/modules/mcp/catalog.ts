export const mcpTools = [
  "get_connection",
  "list_objects",
  "describe_object",
  "list_automations",
  "list_validation_rules",
  "security_summary",
  "knowledge_posture",
  "org_limits",
] as const;

export type McpToolName = (typeof mcpTools)[number];

export function isMcpToolName(value: string): value is McpToolName {
  return mcpTools.includes(value as McpToolName);
}
