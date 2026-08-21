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

MCP collects evidence. Intelligence interprets it. Tools return maps where the domain needs them, not only counts.

| Tool | Returns | Never returns |
| --- | --- | --- |
| `get_connection` | Org id, name, edition/type, connection status | Tokens |
| `list_objects` | API names, label, custom/standard, queryable, layoutable, custom setting | Rows |
| `describe_object` | Fields the object UI shows (not Id, delete flag, or audit timestamps), types, requiredness, formula/read-only/unique/external ID, relationship kind, record types | Field values |
| `list_automations` | Automation map: Flow/Apex/Workflow bound to object, trigger, status. Flow object from FlowDefinitionView when available | Apex source, Flow XML, actions when Tooling does not expose them |
| `list_validation_rules` | Object, rule name, active | Rule formulas that embed customer data |
| `list_process_controls` | Queues (with object when known), assignment, escalation, auto-response, approval processes, business hours | Queue members, user assignments |
| `security_summary` | Profiles, permission sets, permission set groups, roles, default sharing | User names, emails, object/field CRUD (not yet mapped) |
| `knowledge_posture` | Draft, published, and archived **article counts**; data category **names** | Article bodies, titles, coverage, freshness |
| `org_limits` | API and storage limits, installed package names | Record payloads |
| `get_integration_map` | Named credentials (host only), connected apps, remote sites, external objects, platform events | Secrets, full callback URLs with query strings |
| `get_agentforce_configuration` | Existing bots/agents, prompt templates, AI functions when the APIs exist | Prompt bodies, customer utterances |

If volume is needed later, add aggregate-count tools only (`count_records` with an allowlisted object list). Do not add a generic query tool. `knowledge_posture` already returns allowlisted article counts by publish status.

## Implementation notes

- Tool input/output schemas are Zod types shared with `modules/enterprise`
- Salesforce HTTP stays in `modules/connectors/salesforce`
- Prefer live tool calls during an assessment; persist a normalized snapshot so a run can be replayed and deleted
- Add platforms by implementing the same tool names against a new adapter

## Clients

1. In-app assessment agent (first and required)
2. Later: trusted operator or other model hosts using the same server

Do not expose this server on the public internet. If a remote client is added, it authenticates as an Enigma user and inherits that session’s tenant scope.
