# Enigma Architecture

Enigma is a Synthetic Intelligence platform for AI consumption value and acceleration. Salesforce/Agentforce is the first wedge, not the permanent core.

A metadata inventory plus formulas is not the product. Enigma must reason over a connected org — what it is set up to do, where Agentforce can create value, what it would take, and how fast value can land — and show evidence for every judgment.

## Design principle

```
Platform Connector
  → MCP tool surface
    → Synthetic Intelligence
      → Deterministic economic models
        → Recommendations
          → User Experience
```

Salesforce is an adapter. Intelligence, economics, and UI must not depend on Salesforce API shapes. They call MCP tools that return normalized Enigma types.

## Synthetic Intelligence

An assessment run is an **agent pass**, not a batch rubric over a describe dump.

The model may:

- Decide which objects, automations, and knowledge sources matter for a use case
- Detect and rank opportunities
- Name gaps, risks, and “what must be true”
- Write the readiness story, recommended next move, and executive brief

Org Intelligence is an operational model of the connected environment (environment, workload, process, data, knowledge, automation, access, integrations, platform constraints, and findings). Business signals are judgments derived from that model. They are not the whole intelligence layer.

Every finding and signal must include evidence. Evidence must cite tool results (object present, field missing, Flow active), not ungrounded claims. Volumes, quality percentages, and coverage are never invented. Workload volume, data quality statistics, and external-system integrations stay in the org model as **not observed** until an allowlisted tool reads them. Do not omit those gaps.

The model never receives Salesforce tokens, raw HTTP, or customer records.

Ask Enigma uses Claude (Anthropic Messages API) for MVP conversation. Deployment Justification and Enigma Recommendation are also Claude stories, written on load with number slots so the share slider updates live figures without another model call. Consumption, ROC, and ROA stay calculated. Official Salesforce prices are refused. Without `ANTHROPIC_API_KEY`, Ask and those stories stay on grounded fallback copy.

## What stays deterministic

Use deterministic, tested code for:

- OAuth, token storage, tenant isolation, and permissions
- Which Salesforce APIs are legal (describe / Tooling / Metadata only)
- MCP tool allowlists and argument validation
- Consumption, value, ROC, and ROA **arithmetic** once inputs exist
- Persistence, audit, and deletion

Do not hard-code official Salesforce pricing. Unit prices are customer-specific assumptions.

## Layers

| Layer | Responsibility | Salesforce-specific? |
| --- | --- | --- |
| Presentation | Dashboards, briefs, roadmap, workflow UX | No |
| Recommendations | Prioritized next steps and phased roadmap | No |
| Economic models | Consumption, value, ROC, ROA (calculated) | No |
| Synthetic Intelligence | Reasoning, classification, opportunity detection, narrative | No |
| MCP tool surface | Allowlisted, tenant-scoped tools over connectors and the enterprise model | No |
| Normalized enterprise model | Platform-neutral entities returned by tools | No |
| Platform connectors | Auth, describe/Tooling, mapping into the normalized model | Yes, per adapter |
| Persistence | Multi-tenant PostgreSQL on Supabase (`ppceqvoyexpkguzeseen`) | No |

## MCP

Enigma hosts an **internal** MCP server in front of `modules/connectors` and `modules/enterprise`. It is the contract between intelligence and systems.

It is not Salesforce Agentforce MCP, and it is not a public endpoint.

**Why MCP exists**

- The agent pulls only what it needs instead of stuffing a full org describe into a prompt
- The same tool catalog can serve the in-app assessment run and later other models or operator clients
- A later ServiceNow or Pega adapter is more tools (or another server), not a rewrite of intelligence

**Rules**

- Every tool call carries `tenantId`, `organizationId`, and `connectionId` from the server session
- Tools are allowlisted. There is no generic SOQL or “run any API” tool
- Tokens never appear in tool arguments or results
- Results are metadata only: org objects, fields, automations, security summaries, knowledge *presence*
- Every call is written to `AuditLog`
- Disconnect deletes tokens, cached snapshots, and assessment traces you are not required to keep

See [MCP.md](MCP.md) for the MVP tool catalog.

## Repository layout

```
src/
  app/                 Next.js App Router: pages and route handlers
  components/          Design system and layout
  lib/
    auth/              Enigma user authentication
    db/                Postgres client (postgres.js)
    tenants/           Tenant isolation helpers
    validations/       Zod schemas
  modules/
    connectors/        Platform adapters (Salesforce first)
    enterprise/        Normalized model types and mappers
    mcp/               Internal MCP server and tool definitions
    intelligence/      Assessment agent and explainable outputs
    economics/         Consumption, value, ROC, ROA
    presentation/      Brief and roadmap assembly
  server/
    services/          Tenant-scoped application services
```

`modules/connectors` is the only place Salesforce types and API clients should live. `modules/mcp` may call connectors and enterprise mappers; it must not re-implement Salesforce HTTP.

## Multi-tenancy

Every customer-owned row has `tenantId`.

- Authorization is enforced on the server, never by UI filtering alone.
- Queries go through tenant-scoped helpers.
- A user session always carries `tenantId`.
- Supabase Auth owns identity and session cookies. `User.id` is the Auth user id. Tenant membership and roles stay in Enigma tables and are loaded after the JWT is verified.

Sprint 1 tenancy model: one user belongs to one tenant. A tenant is a partner org (the firm), not an individual AE or RVP. AEs, RVPs, and other users on that org share customers and projects. Customer companies are `Organization` records inside the partner org.

## Security baseline

- Supabase Auth for Enigma users; OAuth for Salesforce; no credentials in the browser
- Secrets and refresh tokens only on the server, encrypted at rest
- Encrypted-in-transit database and API calls
- Metadata-first discovery: objects, fields, automations, security *shape* — not CRM rows
- The `api` OAuth scope can read records; the adapter and MCP layer must never issue record SOQL
- Treat cached org metadata as sensitive enterprise information
- Explicit connect/disconnect and deletion of tokens, snapshots, and traces
- Audit log for connect, disconnect, tool calls, and assessment runs
- Do not send raw Salesforce payloads or tokens to a model

## What this architecture deliberately does not include yet

Pega/ServiceNow/Microsoft adapters, production Agentforce deployment automation, a data warehouse, real-time monitoring, a public MCP endpoint, and a managed Salesforce package.
