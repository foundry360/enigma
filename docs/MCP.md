# MCP Tool Surface

Internal Model Context Protocol server for Enigma Synthetic Intelligence. Lives in `src/modules/mcp`. Not a public server. Not Salesforce Agentforce MCP.

Intelligence calls these tools. Connectors fulfill them. UI and economics never talk to Salesforce directly.

## Call contract

Every tool requires:

- `tenantId` from the server session (never from the model)
- `organizationId` the session may access
- `connectionId` that belongs to that organization

Reject the call if any of those fail. Write `AuditLog` for success and denial.

Never return access tokens, refresh tokens, client secrets, or raw Salesforce HTTP.

## MVP catalog

| Tool | Returns | Never returns |
| --- | --- | --- |
| `get_connection` | Org id, name, edition/type, connection status | Tokens |
| `list_objects` | API names, label, custom/standard, queryable flag | Rows |
| `describe_object` | Fields, types, record types, required flags | Field values |
| `list_automations` | Flow and Apex **trigger** names, status, object, trigger type | Apex source (unless later allowed) |
| `list_validation_rules` | Object, rule name, active | Rule formulas that embed customer data |
| `security_summary` | Profile and permission-set counts; object-permission summaries | User names, emails, session data |
| `knowledge_posture` | Knowledge article objects and data categories if present | Article bodies |
| `org_limits` | Relevant API / feature limits that inform readiness | Record payloads |

If volume is needed later, add aggregate-count tools only (`count_records` with an allowlisted object list). Do not add a generic query tool in MVP.

## Implementation notes

- Tool input/output schemas are Zod types shared with `modules/enterprise`
- Salesforce HTTP stays in `modules/connectors/salesforce`
- Prefer live tool calls during an assessment; persist a normalized snapshot so a run can be replayed and deleted
- Add platforms by implementing the same tool names against a new adapter

## Clients

1. In-app assessment agent (first and required)
2. Later: trusted operator or other model hosts using the same server

Do not expose this server on the public internet. If a remote client is added, it authenticates as an Enigma user and inherits that session’s tenant scope.
