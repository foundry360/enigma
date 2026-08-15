# Minimum Database Schema

Provider: Supabase Postgres (project `ppceqvoyexpkguzeseen`, `us-east-2`). Prisma is the schema and migration tool.

- `DATABASE_URL` uses the transaction pooler (`:6543`, `pgbouncer=true`).
- `DIRECT_URL` uses session mode on the pooler (`:5432`) for migrations.
- Enigma tables have RLS enabled and grants revoked from `anon` / `authenticated`. The Next.js app talks to Postgres through Prisma, not PostgREST. Do not query tenant tables with the anon key.

## Sprint 1 entities

```mermaid
erDiagram
  Tenant ||--o{ User : has
  Tenant ||--o{ Organization : owns
  Tenant ||--o{ AuditLog : records
  Organization ||--o{ PlatformConnection : connects
  Organization ||--o{ Assessment : assesses
```

| Table | Purpose |
| --- | --- |
| `Tenant` | Enigma customer (AE team, partner, later enterprise customer) |
| `User` | Authenticated Enigma user, always scoped to one tenant |
| `Organization` | Account being assessed (the customer's company) |
| `PlatformConnection` | Generic connection to an enterprise platform |
| `Assessment` | One analysis run against an organization |
| `AuditLog` | Tenant-scoped security and activity trail |

`PlatformConnection.platformType` is an enum (`SALESFORCE` first). Tokens are not stored until Sprint 2.

## Tenant isolation rule

Every customer-owned table includes `tenantId` and an index on `tenantId`.

Server queries must include `{ tenantId }` from the session. Frontend filtering is not sufficient.

## Later tables (not created in Sprint 1)

- Normalized discovery: `EnterpriseObject`, `Field`, `Automation`, `KnowledgeSource`, `BusinessProcess`
- Intelligence: `ReadinessAssessment`, `ReadinessDimension`, `Opportunity`
- Economics: `ConsumptionModel`, `ConsumptionScenario`, `ValueModel`
- Delivery: `Recommendation`, `Roadmap`, `RoadmapPhase`, `ExecutiveBrief`

These belong to an `Assessment` and inherit `tenantId`.

## Pricing

No pricing constants live in the database seed or application code as if they were official Salesforce prices. Consumption unit prices are customer-specific assumptions, introduced in Sprint 4 as configurable model inputs.
