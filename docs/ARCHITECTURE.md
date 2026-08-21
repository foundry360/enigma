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
- Collect durable work from inventory, then reason over that pool against the project objective. An opportunity is a selected fit, not a use-case catalog pick. More than one work object can be a fit. Objects in the pool can be rejected. If the model is unavailable, rank from metadata and say so.
- Name gaps, risks, and “what must be true”
- Write the readiness story, recommended next move, and executive brief

Org Intelligence is an operational model of the connected environment (environment, workload, process, data, knowledge, automation, access, integrations, existing AI, platform constraints, and findings). Business signals are judgments derived from that model. They are not the whole intelligence layer.

MCP collects evidence. Intelligence normalizes it into that model. The model, not the connector, decides what is operating work. The object inventory is the source of truth for every cloud present in the org. There is no allowlist of Case, Opportunity, or any other product catalog. A queryable custom object is named from inventory. A licensed standard object is named from inventory when it is layoutable and not a platform artifact (Share, History, Feed, ChangeEvent, custom setting, mdt). Catalog presence is not operating work. Treat a standard object as in-use only when metadata shows custom fields, record types, automations, validation rules, assignment, escalation, or approval on that object. Discovery describes a capped set of inventory objects, preferring those this run's automations and rules already name, never the full org dump.

Automation evidence is an object-scoped map (object → automation → trigger), not a flow count. Process intelligence reconstructs entry, work, assignment, activity, escalation, and resolution when those controls are present. Grounded answers means published knowledge articles an agent could retrieve. Draft, published, and archived article counts are observed as aggregates only; article bodies are not read. Article object types are not content. Expert-user, vote, and history objects are not a knowledge base. Integrations and existing Agentforce configuration are first-class domains; if the tool did not run, the model says they were not observed. Object- and field-level access for an agent identity is not mapped yet and must stay named as a gap.

Every finding and signal must include evidence. Evidence must cite tool results (object present, field missing, Flow active), not ungrounded claims. Volumes, quality percentages, and coverage are never invented. Workload volume, data quality statistics, and external-system integrations stay in the org model as **not observed** until an allowlisted tool reads them. Do not omit those gaps.

The model never receives Salesforce tokens, raw HTTP, or customer records.

The assessment run is:

```
MCP tools
  → normalize facts
    → Org Intelligence (evidence, domains, findings, gaps)
      → Business Signals
        → Opportunity Fit (the only model call on the run)
          → opportunity candidates and stored brief
```

The Starting Enigma Intelligence modal polls that pass and shows a status bar for understanding the operating environment; mapping work, data, and processes; analyzing knowledge, automation, and access; building organizational intelligence; identifying agent opportunities; and preparing the intelligence brief.

Org Intelligence does not depend on Opportunity Fit. A selected opportunity may be attached to the brief after the model is built; it must not change workload roles, findings, or facts.

The Opportunity Fit pass tries local Llama first (`INFERENCE_URL` / `INFERENCE_MODEL`, Ollama by default), then Claude if Llama is not configured or does not respond. Ask Enigma uses Claude (Anthropic Messages API) for MVP conversation. Deployment Rationale and Enigma Recommendation are also Claude stories, written on load with number slots so the share slider updates live figures without another model call. Those stories are rewritten when intelligence is run again, when the promoted opportunity set changes, or when the story template version changes. They must name every promoted opportunity with its finding, confidence, and signal strengths, not a tautology of the capability name. Multi-opportunity cases must not collapse into the first line's process. Grounded fallback copy uses the same briefing. Deployment is a forecast inherited from Intelligence, the opportunity, and the saved business case. Scenario math, consumption, value, ROC, and the forecast decision stay calculated. The approved forecast baseline is stored on the business case for later Outcomes comparison. Official Salesforce prices are refused. Without `ANTHROPIC_API_KEY`, Ask and those stories stay on grounded fallback copy.

## What stays deterministic

Use deterministic, tested code for:

- OAuth, token storage, tenant isolation, and permissions
- Which Salesforce APIs are legal (describe / Tooling / Metadata, plus allowlisted aggregate counts with no rows)
- MCP tool allowlists and argument validation
- Consumption, value, ROC, and ROA **arithmetic** once inputs exist. Project work-per-year, work item cost, hours, and labor are shared case assumptions. Identical copies on every promoted line are counted once, not multiplied by the number of opportunities. Distinct work streams still add.
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
