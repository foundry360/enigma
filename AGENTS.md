<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Enigma

Read `docs/ARCHITECTURE.md` and `docs/IMPLEMENTATION_PLAN.md` before adding features.

- Salesforce is an adapter under `src/modules/connectors`. Do not leak Salesforce types into engines or UI.
- Keep scoring, consumption, ROC, and ROA deterministic and tested.
- Every customer-owned query must include `tenantId` from the server session.
- Never put secrets, OAuth client secrets, or Salesforce tokens in client code.
- Do not hard-code Salesforce pricing.
