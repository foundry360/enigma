# Salesforce Integration Approach

Sprint 2 work. Documented now so Sprint 1 does not paint us into a Salesforce-shaped core.

## OAuth

Use the Salesforce Web Server flow (authorization code) with a Connected App.

1. User clicks Connect Salesforce.
2. Browser redirects to Salesforce authorize URL (`response_type=code`).
3. Salesforce redirects to a server-side Enigma callback.
4. The server exchanges `code` for tokens. The client never sees the client secret or refresh token.
5. Tokens are stored encrypted, associated with `PlatformConnection`.
6. Disconnect revokes the token where possible and deletes stored credentials.

Required Connected App settings:

- Callback URL: `{APP_URL}/api/connectors/salesforce/callback`
- Selected OAuth scopes: `api`, `refresh_token`, `id`
- Require secret for Web Server flow

Environment variables (never client-side):

```
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_CALLBACK_URL=
```

Use `https://test.salesforce.com` for Developer/sandbox orgs when needed.

## Adapter boundary

```
Salesforce REST / Metadata / Tooling
  → Salesforce Adapter (modules/connectors/salesforce)
    → Normalized Enigma Model (modules/enterprise)
```

No page, engine, or economic calculator may import Salesforce API types.

## First discovery APIs (Sprint 2)

Metadata-first. Do not pull unnecessary record data.

| Need | API | Endpoint / type |
| --- | --- | --- |
| Org identity | REST | `/services/oauth2/userinfo` and Organization describe |
| Object inventory | REST | `/services/data/v61.0/sobjects/` |
| Object/field/record-type shape | REST | `/sobjects/{name}/describe` |
| Flows | Tooling | `FlowDefinition`, `Flow` |
| Apex | Tooling | `ApexClass` (names, namespaces, size — not source unless required) |
| Validation rules | Tooling | `ValidationRule` |
| Custom objects | Metadata or Tooling | `CustomObject` |
| Service/sales signals | REST describe + limits | Case, Lead, Opportunity, KnowledgeArticle presence |
| Security posture | REST / Tooling | Profile, PermissionSet counts and object-permission summaries |
| Knowledge posture | REST describe | Knowledge article objects and data categories if present |

Prefer describe/list metadata over querying customer records. If volume is needed later, use aggregate counts only.

## Mapping examples

| Salesforce | Enigma |
| --- | --- |
| Organization | Organization + PlatformConnection |
| Case | Interaction / TransactionType |
| Flow | Automation |
| Apex class | Automation |
| Knowledge article | KnowledgeSource |
| Profile / Permission Set | Permission / UserRole |

## Safety

- Least-privilege Connected App
- Server-side only token use
- No secrets in frontend bundles
- Explicit disconnect and later deletion of cached metadata
- Treat all connected org metadata as sensitive enterprise information
