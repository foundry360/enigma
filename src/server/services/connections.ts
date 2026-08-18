import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";
import { createId, sql } from "@/lib/db/sql";
import type { PlatformConnectionRow } from "@/lib/db/types";
import { requireTenantId } from "@/lib/tenants/scope";
import {
  fetchSalesforceIdentity,
  mapSalesforceOrgProfile,
  withSalesforceAccess,
} from "@/modules/connectors/salesforce";
import type { OrgProfile } from "@/modules/enterprise/types";
import { writeAuditLog } from "@/server/services/audit";

const CONNECTION_PUBLIC_COLUMNS = `
  id, "tenantId", "organizationId", "platformType", status,
  "externalOrgId", "externalOrgName", "instanceUrl", "orgProfile",
  "connectedAt", "createdAt", "updatedAt"
`;

export type PublicConnection = PlatformConnectionRow & {
  instanceUrl: string | null;
};

export async function getPublicConnection(
  tenantId: string,
  connectionId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [connection] = await sql<PublicConnection[]>`
    select ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
    from "PlatformConnection"
    where "tenantId" = ${scoped} and id = ${connectionId}
    limit 1
  `;
  return connection ?? null;
}

export async function listPublicConnections(
  tenantId: string,
  organizationId: string,
) {
  const scoped = requireTenantId(tenantId);
  return sql<PublicConnection[]>`
    select ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
    from "PlatformConnection"
    where "tenantId" = ${scoped} and "organizationId" = ${organizationId}
    order by "updatedAt" desc
  `;
}

export async function createConnectedSalesforce(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  refreshToken: string;
  instanceUrl: string;
  externalOrgId: string | null;
  externalOrgName: string | null;
  orgProfile?: OrgProfile | null;
}) {
  const scoped = requireTenantId(input.tenantId);
  const ciphertext = encryptSecret(input.refreshToken);
  const existing = input.externalOrgId
    ? await sql<PublicConnection[]>`
        select ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
        from "PlatformConnection"
        where
          "tenantId" = ${scoped}
          and "organizationId" = ${input.organizationId}
          and "platformType" = 'SALESFORCE'
          and "externalOrgId" = ${input.externalOrgId}
        order by "updatedAt" desc
        limit 1
      `
    : [];

  const connection = existing[0]
    ? (
        await sql<PublicConnection[]>`
          update "PlatformConnection"
          set
            status = 'CONNECTED',
            "externalOrgName" = ${input.externalOrgName},
            "instanceUrl" = ${input.instanceUrl},
            "orgProfile" = ${input.orgProfile ? sql.json(input.orgProfile) : null},
            "connectedAt" = now(),
            "updatedAt" = now()
          where "tenantId" = ${scoped} and id = ${existing[0].id}
          returning ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
        `
      )[0]
    : (
        await sql<PublicConnection[]>`
          insert into "PlatformConnection" (
            id, "tenantId", "organizationId", "platformType", status,
            "externalOrgId", "externalOrgName", "instanceUrl", "orgProfile",
            "connectedAt", "createdAt", "updatedAt"
          )
          values (
            ${createId()},
            ${scoped},
            ${input.organizationId},
            'SALESFORCE',
            'CONNECTED',
            ${input.externalOrgId},
            ${input.externalOrgName},
            ${input.instanceUrl},
            ${input.orgProfile ? sql.json(input.orgProfile) : null},
            now(),
            now(),
            now()
          )
          returning ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
        `
      )[0];

  if (!connection) {
    throw new Error("Salesforce connection could not be saved.");
  }

  await sql`
    insert into "ConnectionSecret" (
      "connectionId", "tenantId", "refreshTokenCiphertext", "createdAt", "updatedAt"
    )
    values (${connection.id}, ${scoped}, ${ciphertext}, now(), now())
    on conflict ("connectionId") do update
    set
      "refreshTokenCiphertext" = excluded."refreshTokenCiphertext",
      "updatedAt" = now()
  `;

  await writeAuditLog({
    tenantId: scoped,
    userId: input.userId,
    action: "connection.connect",
    entity: "PlatformConnection",
    entityId: connection.id,
    metadata: {
      platformType: "SALESFORCE",
      organizationId: input.organizationId,
      externalOrgId: input.externalOrgId,
    },
  });

  return connection;
}

export async function persistConnectionOrgProfile(
  tenantId: string,
  connectionId: string,
  profile: OrgProfile,
) {
  const scoped = requireTenantId(tenantId);

  await sql`
    update "PlatformConnection"
    set
      "orgProfile" = ${sql.json(profile)},
      "externalOrgName" = coalesce(${profile.name}, "externalOrgName"),
      "externalOrgId" = coalesce(${profile.orgId}, "externalOrgId"),
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${connectionId}
  `;
}

export async function getConnectionOrgProfile(
  tenantId: string,
  connectionId: string,
): Promise<OrgProfile | null> {
  const scoped = requireTenantId(tenantId);
  const connection = await getPublicConnection(scoped, connectionId);

  if (!connection) {
    return null;
  }

  if (connection.orgProfile) {
    return connection.orgProfile;
  }

  return {
    metadataType: "Organization",
    name: connection.externalOrgName,
    orgId: connection.externalOrgId,
    organizationType: null,
    instanceKind: "unknown",
    instanceName: null,
    namespacePrefix: null,
    createdAt: null,
    createdBy: null,
    lastModifiedAt: null,
    lastModifiedBy: null,
    locale: null,
    language: null,
    timeZone: null,
  };
}

export async function probeSalesforceConnection(
  tenantId: string,
  connectionId: string,
) {
  const scoped = requireTenantId(tenantId);
  const connection = await getPublicConnection(scoped, connectionId);
  const refreshToken = connection?.instanceUrl
    ? await getConnectionRefreshToken(scoped, connection.id)
    : null;

  if (!connection?.instanceUrl || !refreshToken) {
    return { ok: false as const, expired: true, message: "Salesforce is not connected." };
  }

  try {
    await withSalesforceAccess({
      instanceUrl: connection.instanceUrl,
      refreshToken,
      onRotatedRefreshToken: (nextToken) =>
        persistConnectionRefreshToken(scoped, connection.id, nextToken),
      run: async () => undefined,
    });
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Salesforce request failed.";
    return {
      ok: false as const,
      expired: /expired|invalid_grant|invalid token/i.test(message),
      message,
    };
  }
}

export async function persistConnectionRefreshToken(
  tenantId: string,
  connectionId: string,
  refreshToken: string,
) {
  const scoped = requireTenantId(tenantId);
  const ciphertext = encryptSecret(refreshToken);

  await sql`
    update "ConnectionSecret"
    set
      "refreshTokenCiphertext" = ${ciphertext},
      "updatedAt" = now()
    where "tenantId" = ${scoped} and "connectionId" = ${connectionId}
  `;
}

export async function refreshSalesforceIdentities(
  tenantId: string,
  connections: PublicConnection[],
) {
  const scoped = requireTenantId(tenantId);
  const connected = connections.filter(
    (connection) =>
      connection.platformType === "SALESFORCE" &&
      connection.status === "CONNECTED" &&
      Boolean(connection.instanceUrl),
  );

  if (connected.length === 0) {
    return { connections, identityError: false };
  }

  let identityError = false;
  const refreshed = await Promise.all(
    connected.map(async (connection) => {
      try {
        const refreshToken = await getConnectionRefreshToken(
          scoped,
          connection.id,
        );

        if (!refreshToken || !connection.instanceUrl) {
          identityError = true;
          return connection;
        }

        const identity = await withSalesforceAccess({
          instanceUrl: connection.instanceUrl,
          refreshToken,
          onRotatedRefreshToken: (nextToken) =>
            persistConnectionRefreshToken(scoped, connection.id, nextToken),
          run: (accessToken) =>
            fetchSalesforceIdentity({
              instanceUrl: connection.instanceUrl!,
              accessToken,
            }),
        });

        const name =
          identity.organization_name?.trim() || connection.externalOrgName;
        const orgId = identity.organization_id ?? connection.externalOrgId;

        if (
          name === connection.externalOrgName &&
          orgId === connection.externalOrgId
        ) {
          return connection;
        }

        const [updated] = await sql<PublicConnection[]>`
          update "PlatformConnection"
          set
            "externalOrgName" = ${name},
            "externalOrgId" = ${orgId},
            "updatedAt" = now()
          where "tenantId" = ${scoped} and id = ${connection.id}
          returning ${sql.unsafe(CONNECTION_PUBLIC_COLUMNS)}
        `;

        return updated ?? connection;
      } catch {
        identityError = true;
        return connection;
      }
    }),
  );

  const byId = new Map(refreshed.map((connection) => [connection.id, connection]));
  return {
    connections: connections.map(
      (connection) => byId.get(connection.id) ?? connection,
    ),
    identityError,
  };
}

export async function getConnectionRefreshToken(
  tenantId: string,
  connectionId: string,
) {
  const scoped = requireTenantId(tenantId);
  const [secret] = await sql<{ refreshTokenCiphertext: string }[]>`
    select "refreshTokenCiphertext"
    from "ConnectionSecret"
    where "tenantId" = ${scoped} and "connectionId" = ${connectionId}
    limit 1
  `;

  if (!secret) {
    return null;
  }

  return decryptSecret(secret.refreshTokenCiphertext);
}

export async function disconnectSalesforce(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  connectionId: string;
}) {
  const scoped = requireTenantId(input.tenantId);
  const connection = await getPublicConnection(scoped, input.connectionId);

  if (
    !connection ||
    connection.organizationId !== input.organizationId ||
    connection.platformType !== "SALESFORCE"
  ) {
    return null;
  }

  const refreshToken = await getConnectionRefreshToken(scoped, connection.id);

  await sql`
    delete from "ConnectionSecret"
    where "tenantId" = ${scoped} and "connectionId" = ${connection.id}
  `;

  await sql`
    update "PlatformConnection"
    set
      status = 'DISCONNECTED',
      "instanceUrl" = null,
      "connectedAt" = null,
      "updatedAt" = now()
    where "tenantId" = ${scoped} and id = ${connection.id}
  `;

  await writeAuditLog({
    tenantId: scoped,
    userId: input.userId,
    action: "connection.disconnect",
    entity: "PlatformConnection",
    entityId: connection.id,
    metadata: {
      platformType: "SALESFORCE",
      organizationId: input.organizationId,
    },
  });

  return { connection, refreshToken };
}
