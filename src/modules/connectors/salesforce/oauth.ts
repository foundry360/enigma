import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import { getSalesforceOAuthConfig } from "@/modules/connectors/salesforce/env";
import { salesforceRequest } from "@/modules/connectors/salesforce/http";
import {
  restQueries,
  salesforcePath,
} from "@/modules/connectors/salesforce/paths";

const OAUTH_SCOPES = "api refresh_token id";

export type SalesforceOAuthState = {
  nonce: string;
  organizationId: string;
  projectId?: string;
  returnTo: string;
  codeVerifier: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id?: string;
};

type UserInfo = {
  organization_id?: string;
  organization_name?: string;
};

type OrganizationQuery = {
  records?: {
    Id?: string;
    Name?: string;
    OrganizationType?: string;
    IsSandbox?: boolean;
    InstanceName?: string;
    NamespacePrefix?: string | null;
    CreatedDate?: string;
    LastModifiedDate?: string;
    CreatedBy?: { Name?: string };
    LastModifiedBy?: { Name?: string };
    DefaultLocaleSidKey?: string;
    LanguageLocaleKey?: string;
    TimeZoneSidKey?: string;
  }[];
};

export type SalesforceIdentity = {
  organization_id: string | null;
  organization_name: string | null;
  organization_type: string | null;
  is_sandbox: boolean | null;
  instance_name: string | null;
  namespace_prefix: string | null;
  created_at: string | null;
  created_by: string | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
  locale: string | null;
  language: string | null;
  time_zone: string | null;
};

export function createOAuthState(input: {
  organizationId: string;
  projectId?: string;
  returnTo: string;
}): SalesforceOAuthState {
  return {
    nonce: randomBytes(16).toString("hex"),
    organizationId: input.organizationId,
    projectId: input.projectId,
    returnTo: input.returnTo,
    codeVerifier: randomBytes(32).toString("base64url"),
  };
}

export function sealOAuthState(state: SalesforceOAuthState) {
  return encryptSecret(JSON.stringify(state));
}

export function openOAuthState(sealed: string): SalesforceOAuthState {
  return JSON.parse(decryptSecret(sealed)) as SalesforceOAuthState;
}

export function buildAuthorizeUrl(state: SalesforceOAuthState) {
  const config = getSalesforceOAuthConfig();
  const challenge = createHash("sha256")
    .update(state.codeVerifier)
    .digest("base64url");
  const url = new URL("/services/oauth2/authorize", config.loginUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("state", state.nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}) {
  const config = getSalesforceOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.callbackUrl,
    code_verifier: input.codeVerifier,
  });

  return salesforceRequest<TokenResponse>({
    instanceUrl: config.loginUrl,
    path: "/services/oauth2/token",
    method: "POST",
    body,
  });
}

export async function refreshAccessToken(input: {
  instanceUrl: string;
  refreshToken: string;
}) {
  const config = getSalesforceOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  return salesforceRequest<TokenResponse>({
    instanceUrl: config.loginUrl,
    path: "/services/oauth2/token",
    method: "POST",
    body,
  });
}

export async function revokeRefreshToken(input: {
  instanceUrl: string;
  refreshToken: string;
}) {
  const body = new URLSearchParams({ token: input.refreshToken });

  try {
    await salesforceRequest<void>({
      instanceUrl: input.instanceUrl,
      path: "/services/oauth2/revoke",
      method: "POST",
      body,
    });
  } catch {
    // Revoke is best-effort; local credentials are still deleted.
  }
}

export async function fetchSalesforceIdentity(input: {
  instanceUrl: string;
  accessToken: string;
}): Promise<SalesforceIdentity> {
  const userinfo = await salesforceRequest<UserInfo>({
    instanceUrl: input.instanceUrl,
    accessToken: input.accessToken,
    path: salesforcePath("userinfo"),
  });

  let organizationId = userinfo.organization_id ?? null;
  let organizationName = userinfo.organization_name?.trim() || null;
  let organizationType: string | null = null;
  let isSandbox: boolean | null = null;
  let instanceName: string | null = null;
  let namespacePrefix: string | null = null;
  let createdAt: string | null = null;
  let createdBy: string | null = null;
  let lastModifiedAt: string | null = null;
  let lastModifiedBy: string | null = null;
  let locale: string | null = null;
  let language: string | null = null;
  let timeZone: string | null = null;

  try {
    const org = await salesforceRequest<OrganizationQuery>({
      instanceUrl: input.instanceUrl,
      accessToken: input.accessToken,
      path: salesforcePath("query", restQueries.organization),
    });
    const record = org.records?.[0];
    if (record?.Id) {
      organizationId = record.Id;
    }
    if (record?.Name?.trim()) {
      organizationName = record.Name.trim();
    }
    organizationType = record?.OrganizationType ?? null;
    isSandbox = record?.IsSandbox ?? null;
    instanceName = record?.InstanceName ?? null;
    namespacePrefix = record?.NamespacePrefix ?? null;
    createdAt = record?.CreatedDate ?? null;
    createdBy = record?.CreatedBy?.Name ?? null;
    lastModifiedAt = record?.LastModifiedDate ?? null;
    lastModifiedBy = record?.LastModifiedBy?.Name ?? null;
    locale = record?.DefaultLocaleSidKey ?? null;
    language = record?.LanguageLocaleKey ?? null;
    timeZone = record?.TimeZoneSidKey ?? null;
  } catch {
    // Company Information is preferred; userinfo is the fallback.
  }

  return {
    organization_id: organizationId,
    organization_name: organizationName,
    organization_type: organizationType,
    is_sandbox: isSandbox,
    instance_name: instanceName,
    namespace_prefix: namespacePrefix,
    created_at: createdAt,
    created_by: createdBy,
    last_modified_at: lastModifiedAt,
    last_modified_by: lastModifiedBy,
    locale,
    language,
    time_zone: timeZone,
  };
}

export function instanceKind(
  instanceUrl: string | null,
): "production" | "sandbox" | "unknown" {
  if (!instanceUrl) {
    return "unknown";
  }

  try {
    const host = new URL(instanceUrl).host;
    if (host.includes("test.salesforce.com") || host.includes(".sandbox.")) {
      return "sandbox";
    }
    if (host.includes("salesforce.com") || host.includes("force.com")) {
      return "production";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}
