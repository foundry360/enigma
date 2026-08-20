# Phased Implementation Plan

## Current state (2026-08-16)

Sprint 1 foundation and workspace UX are in the repo: Next.js 16, Supabase Postgres (`ppceqvoyexpkguzeseen`) via postgres.js, Supabase Auth, tenant-scoped profiles, organizations, projects, assessments shell, and connection UI. Salesforce OAuth, MCP, and Synthetic Intelligence are documented, not implemented.

Architecture revision: Enigma is an AI-first assessment product. Discovery is metadata-only. Intelligence is an agent that uses an internal MCP server. Economics stay calculated.

## Success bar for MVP

A user can create an Enigma account, connect a Salesforce Developer Org, run an assessment, and in under 15 minutes see readiness (with evidence), at least three opportunities, consumption scenarios, business value, ROC, ROA, a roadmap, and an executive brief.

The assessment is a Synthetic Intelligence run grounded in MCP tool evidence, not a static checklist over a describe dump.

Do not start Agentforce deployment automation until that assessment → value workflow works end to end.

---

## Sprint 1 — Foundation

**Goal:** A running multi-tenant Enigma app with authentication, tenant model, and an executive UI shell.

- Next.js + TypeScript + Tailwind
- PostgreSQL via postgres.js
- Email/password auth (Supabase Auth)
- Tenant + user + organization + project + assessment + connection + audit schema
- Design system, workspace sign-in, and navigation that makes the MVP workflow visible
- Tenant-isolation helpers and tests

**Status:** In place.

**Out of scope (then and now until later sprints):** Salesforce OAuth, MCP, intelligence, economics.

---

## Sprint 2 — Salesforce adapter and MCP

**Goal:** Connect a Salesforce Developer Org and let intelligence ask metadata questions through MCP.

- Connected App OAuth (Web Server flow); encrypted tokens on `PlatformConnection`
- Connection management (connect, status, disconnect + revoke)
- Salesforce adapter isolated under `modules/connectors/salesforce`
- Metadata-only APIs: describe, Tooling, org identity — no CRM rows
- Internal MCP server (`modules/mcp`) with the [MVP tool catalog](MCP.md)
- Normalized types in `modules/enterprise`; persist a snapshot that can be deleted
- Audit every connect, disconnect, and tool call

**Dependencies:** Sprint 1 auth, tenant, `PlatformConnection`.

**Out of scope:** Opportunity narrative, scoring UI, economics, public MCP, record SOQL.

---

## Sprint 3 — Synthetic Intelligence

**Goal:** An assessment run that reasons over the connected org via MCP.

- Assessment agent that calls only allowlisted MCP tools
- Readiness across data, process, knowledge, automation, security, governance
- Each dimension: score, evidence (tool citations), reason, risk, recommendation
- Opportunity detection from durable work in the org, ranked by a model pass over MCP evidence
- Persist run traces needed for explainability; do not persist tokens or raw Salesforce HTTP
- No unexplained scores

**Dependencies:** Sprint 2 connection + MCP tools.

---

## Sprint 4 — Economics

**Goal:** Configurable consumption and value models, plus ROC and ROA.

- Conservative / expected / aggressive scenarios
- Configurable unit price and volume assumptions (never hard-coded as official Salesforce pricing)
- Value model (labor, deflection, implementation cost)
- Return on Consumption and Return on Acceleration
- Tests for every formula
- Intelligence may propose inputs; formulas calculate results

**Dependencies:** Sprint 3 opportunities and volume/readiness inputs.

---

## Sprint 5 — Experience

**Goal:** The AE-facing assessment story.

- Account and project assessment views fed by intelligence outputs
- Opportunity detail
- Prioritized roadmap
- Executive opportunity brief
- Workflow UX that matches Connect → Discover → Assess → Prioritize → Model → Recommend

**Dependencies:** Sprint 3–4 outputs.

---

## Sprint 6 — Pilot hardening

**Goal:** Safe to put in front of a Salesforce AE on a Developer Org.

- Error handling, logging, audit events (including MCP denials)
- Performance on typical metadata volumes and typical agent tool-call counts
- Demo data
- Security review of OAuth, token encryption, tenant isolation, MCP allowlist, and deletion
- End-to-end Developer Org test of the MVP success bar

---

## Explicitly deferred

Pega, ServiceNow, Microsoft, production deployment automation, Agentforce configuration automation, real-time monitoring, a warehouse, a public MCP endpoint, a broad multi-platform UI, and a managed Salesforce package.
