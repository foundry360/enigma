# Enigma

AI consumption value and acceleration platform. The first wedge is Salesforce Agentforce opportunity assessment for AEs, RVPs, and partners.

The product question:

> Where can Agentforce create measurable business value in this Salesforce environment, what would it take to deploy, what consumption might be generated, and how quickly can the customer realize value?

## Current status

Sprint 1 foundation is in place: Next.js app, tenant model, authentication, design system, and the assessment workflow shell.

Salesforce OAuth, discovery, scoring, and economics are not built yet. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Local setup

Requires Node 20+. The database is Supabase project `ppceqvoyexpkguzeseen`.

```bash
cp .env.example .env
# Fill DATABASE_URL, DIRECT_URL, SESSION_SECRET, and Supabase keys

npx prisma migrate deploy
npm run dev
```

Create a workspace at [http://localhost:3000/signup](http://localhost:3000/signup).

## Architecture

Salesforce is an adapter, not the core model:

```
Platform Connector → Normalized Enterprise Model → Intelligence → Economics → UX
```

Details:

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Salesforce OAuth and first APIs](docs/SALESFORCE.md)
- [Phased plan](docs/IMPLEMENTATION_PLAN.md)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm test` | Tenant isolation and unit tests |
| `npx prisma migrate dev` | Apply schema changes |
