# Phased Implementation Plan

## Current state (2026-08-15)

The repository was empty. Sprint 1 foundation is now in the repo: Next.js 16, Supabase Postgres (`ppceqvoyexpkguzeseen`) via postgres.js, Supabase Auth plus tenant-scoped profiles, UI shell, and this plan. Salesforce OAuth is documented, not implemented.

## Success bar for MVP

A user can create an Enigma account, connect a Salesforce Developer Org, run an assessment, and in under 15 minutes see readiness (with evidence), at least three opportunities, consumption scenarios, business value, ROC, ROA, a roadmap, and an executive brief.

Do not start Agentforce deployment automation until that assessment → value workflow works end to end.

---

## Sprint 1 — Foundation (this sprint)

**Goal:** A running multi-tenant Enigma app with authentication, tenant model, and an executive UI shell.

- Next.js + TypeScript + Tailwind
- PostgreSQL via postgres.js
- Email/password auth (Auth.js)
- Tenant + user + organization + assessment + connection + audit schema
- Design system and navigation that makes the MVP workflow visible
- Tenant-isolation helpers and tests

**Out of scope:** Salesforce OAuth, discovery, scoring, economics.

**Next step after this sprint:** Salesforce connection and metadata discovery.

---

## Sprint 2 — Salesforce

**Goal:** Connect a Salesforce Developer Org and persist a normalized snapshot of safe metadata.

- Connected App OAuth
- Connection management (connect, status, disconnect)
- Salesforce adapter isolated from app logic
- Object/automation/security/knowledge inventory via describe + Tooling
- Map into normalized enterprise types

**Dependencies:** Sprint 1 auth, tenant, `PlatformConnection`.

---

## Sprint 3 — Intelligence

**Goal:** Explainable readiness and opportunity detection from the normalized model.

- Readiness engine (0–100) across data, process, knowledge, automation, security, governance
- Each dimension: score, evidence, reason, risk, recommendation
- Opportunity detection for a small, credible Agentforce catalog
- Explainable opportunity scores

**Dependencies:** Sprint 2 normalized snapshot. Deterministic scoring only.

---

## Sprint 4 — Economics

**Goal:** Configurable consumption and value models, plus ROC and ROA.

- Conservative / expected / aggressive scenarios
- Configurable unit price and volume assumptions (never hard-coded as official Salesforce pricing)
- Value model (labor, deflection, implementation cost)
- Return on Consumption and Return on Acceleration
- Tests for every formula

**Dependencies:** Sprint 3 opportunities and volume/readiness inputs.

---

## Sprint 5 — Experience

**Goal:** The AE-facing assessment story.

- Account assessment dashboard
- Opportunity detail
- Prioritized roadmap
- Executive opportunity brief
- Workflow UX that matches Connect → Discover → Assess → Prioritize → Model → Recommend

**Dependencies:** Sprint 3–4 outputs.

---

## Sprint 6 — Pilot hardening

**Goal:** Safe to put in front of a Salesforce AE on a Developer Org.

- Error handling, logging, audit events
- Performance on typical metadata volumes
- Demo data
- Security review of OAuth, tenant isolation, and deletion
- End-to-end Developer Org test of the MVP success bar

---

## Explicitly deferred

Pega, ServiceNow, Microsoft, production deployment automation, Agentforce configuration automation, real-time monitoring, a warehouse, a broad multi-platform UI, and a managed Salesforce package.
