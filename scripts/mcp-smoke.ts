import { callMcpTool } from "@/modules/mcp";
import { sql } from "@/lib/db/sql";

const SECRET_KEYS = /token|secret|authorization|bearer|password|cookie/i;

function assertSafePayload(value: unknown, path = "data") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafePayload(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEYS.test(key)) {
        throw new Error(`Unsafe key in MCP result: ${path}.${key}`);
      }
      assertSafePayload(child, `${path}.${key}`);
    }
  }
}

async function main() {
  const [connection] = await sql<
    {
      id: string;
      tenantId: string;
      organizationId: string;
      externalOrgName: string | null;
      externalOrgId: string | null;
    }[]
  >`
    select id, "tenantId", "organizationId", "externalOrgName", "externalOrgId"
    from "PlatformConnection"
    where "platformType" = 'SALESFORCE'
      and status = 'CONNECTED'
      and "instanceUrl" is not null
    order by "updatedAt" desc
    limit 1
  `;

  if (!connection) {
    throw new Error("No connected Salesforce org found.");
  }

  const [user] = await sql<{ id: string }[]>`
    select id from "User" where "tenantId" = ${connection.tenantId} limit 1
  `;

  const scope = {
    tenantId: connection.tenantId,
    organizationId: connection.organizationId,
    connectionId: connection.id,
    userId: user?.id,
  };

  const identity = await callMcpTool({ ...scope, tool: "get_connection" });
  const objects = await callMcpTool({ ...scope, tool: "list_objects" });

  if (!identity.ok) {
    throw new Error(`get_connection failed: ${identity.error}`);
  }
  if (!objects.ok) {
    throw new Error(`list_objects failed: ${objects.error}`);
  }

  assertSafePayload(identity.data);
  assertSafePayload(objects.data);

  const listed = objects.data as {
    apiName: string;
    label: string;
    custom: boolean;
    queryable: boolean;
  }[];
  const describeTarget =
    listed.find((object) => object.apiName === "Case")?.apiName ??
    listed.find((object) => !object.custom)?.apiName;

  if (!describeTarget) {
    throw new Error("list_objects returned no describable object.");
  }

  const described = await callMcpTool({
    ...scope,
    tool: "describe_object",
    apiName: describeTarget,
  });

  if (!described.ok) {
    throw new Error(`describe_object failed: ${described.error}`);
  }

  assertSafePayload(described.data);

  const describe = described.data as {
    apiName: string;
    label: string;
    fields: { apiName: string; type: string; required: boolean }[];
    recordTypes: { developerName: string }[];
  };

  const fieldValues = describe.fields.some((field) => "value" in field);

  console.log(
    JSON.stringify(
      {
        org: {
          name: connection.externalOrgName,
          id: connection.externalOrgId,
        },
        get_connection: identity.data,
        list_objects: {
          count: listed.length,
          custom: listed.filter((object) => object.custom).length,
          sample: listed.slice(0, 8).map((object) => object.apiName),
        },
        describe_object: {
          apiName: describe.apiName,
          label: describe.label,
          fieldCount: describe.fields.length,
          recordTypeCount: describe.recordTypes.length,
          required: describe.fields
            .filter((field) => field.required)
            .slice(0, 8)
            .map((field) => field.apiName),
          hasFieldValues: fieldValues,
        },
      },
      null,
      2,
    ),
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
