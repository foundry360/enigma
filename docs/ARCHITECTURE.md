# Enigma Architecture

Enigma is an AI consumption value and acceleration platform. Salesforce/Agentforce is the first wedge, not the permanent core.

## Design principle

```
Platform Connector
  → Normalized Enterprise Model
    → Intelligence Engines
      → Economic Models
        → Recommendations
          → User Experience
```

Salesforce is an adapter. Application logic must not depend on Salesforce API shapes.

## Layers

| Layer | Responsibility | Salesforce-specific? |
| --- | --- | --- |
| Presentation | Dashboards, briefs, roadmap, workflow UX | No |
| Recommendations | Prioritized next steps and phased roadmap | No |
| Economic models | Consumption, value, ROC, ROA | No |
| Intelligence engines | Readiness, opportunity detection, scoring | No |
| Normalized enterprise model | Platform-neutral entities | No |
| Platform connectors | Auth, discovery, mapping into the normalized model | Yes, per adapter |
| Persistence | Multi-tenant PostgreSQL on Supabase (`ppceqvoyexpkguzeseen`) | No |

## Repository layout

```
src/
  app/                 Next.js App Router: pages and route handlers
  components/          Design system and layout
  lib/
    auth/              Enigma user authentication
    db/                Prisma client
    tenants/           Tenant isolation helpers
    validations/       Zod schemas
  modules/
    connectors/        Platform adapters (Salesforce in Sprint 2)
    enterprise/        Normalized model types and mappers
    intelligence/      Readiness and opportunity engines (Sprint 3)
    economics/         Consumption, value, ROC, ROA (Sprint 4)
    presentation/      Brief and roadmap assembly (Sprint 5)
  server/
    services/          Tenant-scoped application services
```

`modules/connectors` is the only place Salesforce types and API clients should live.

## Deterministic vs AI

Use deterministic code for calculations, scores, formulas, validation, permissions, and API handling.

Use AI later for interpretation, classification, reasoning, recommendations, and executive narrative.

Never generate unexplained scores. Every score must include score, evidence, reason, risk, and recommendation.

## Multi-tenancy

Every customer-owned row has `tenantId`.

- Authorization is enforced on the server, never by UI filtering alone.
- Queries go through tenant-scoped helpers.
- A user session always carries `tenantId`.

Sprint 1 tenancy model: one user belongs to one tenant. An AE/RVP/partner firm is a tenant. Customer Salesforce orgs are `Organization` records inside that tenant.

## Security baseline

- OAuth for Salesforce (Sprint 2); no credentials in the browser
- Secrets only in environment variables
- Encrypted-in-transit database and API calls
- Explicit connect/disconnect and later data deletion
- Audit log table exists from Sprint 1 so later actions have a place to write

## What this architecture deliberately does not include yet

Pega/ServiceNow/Microsoft adapters, production Agentforce deployment automation, a data warehouse, real-time monitoring, and a managed Salesforce package.
