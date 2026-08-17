import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const sql = postgres(url, { prepare: false, max: 1 });

const ORG_NAME = "Northern Peak Financial";
const PROJECT_NAME = "Salesforce AI Readiness";

async function main() {
  const orgs = await sql<
    { id: string; tenantId: string; name: string }[]
  >`
    select id, "tenantId", name
    from "Organization"
    where name ilike ${`%Northern Peak%`}
    order by "createdAt" desc
  `;

  if (orgs.length === 0) {
    const allOrgs = await sql<{ id: string; name: string }[]>`
      select id, name from "Organization" order by name
    `;
    console.error(
      `No organization matching "${ORG_NAME}". Existing: ${
        allOrgs.map((org) => org.name).join(", ") || "(none)"
      }`,
    );
    process.exit(1);
  }

  const org = orgs[0];
  const [users, projects, connections] = await Promise.all([
    sql<{ id: string; name: string; email: string }[]>`
      select id, name, email
      from "User"
      where "tenantId" = ${org.tenantId}
      order by "createdAt" asc
    `,
    sql<{ id: string; name: string }[]>`
      select id, name
      from "Project"
      where "organizationId" = ${org.id} and name = ${PROJECT_NAME}
    `,
    sql<{ id: string; status: string; externalOrgName: string | null }[]>`
      select id, status, "externalOrgName"
      from "PlatformConnection"
      where "organizationId" = ${org.id} and "platformType" = 'SALESFORCE'
      order by "updatedAt" desc
    `,
  ]);

  const owner = users[0];

  if (!owner) {
    console.error(`No users on tenant ${org.tenantId}`);
    process.exit(1);
  }

  let connection = connections[0];
  if (!connection) {
    const connectionId = crypto.randomUUID();
    const [created] = await sql<typeof connections>`
      insert into "PlatformConnection" (
        id, "tenantId", "organizationId", "platformType", status,
        "externalOrgId", "externalOrgName", "connectedAt", "createdAt", "updatedAt"
      )
      values (
        ${connectionId},
        ${org.tenantId},
        ${org.id},
        'SALESFORCE',
        'CONNECTED',
        '00D000000000001AAA',
        'Northern Peak Financial — Production',
        now(),
        now(),
        now()
      )
      returning id, status, "externalOrgName"
    `;
    connection = created;
    console.log(`Created Salesforce connection ${connection.id}`);
  }

  if (projects[0]) {
    console.log(`Project already exists: ${projects[0].id}`);
    console.log(`http://localhost:3000/projects/${projects[0].id}`);
    return;
  }

  const projectId = crypto.randomUUID();
  const targetDate = new Date();
  targetDate.setUTCMonth(targetDate.getUTCMonth() + 3);
  const targetDateIso = targetDate.toISOString().slice(0, 10);

  await sql`
    insert into "Project" (
      id, "tenantId", "organizationId", name, "platformType", "projectType",
      objective, outcomes, "outcomeOther", "ownerId", status, description,
      "businessUnit", department, "executiveSponsor", "customerLead",
      "targetDate", priority, "successMetrics", notes, "connectPlatformLater",
      "createdAt", "updatedAt"
    )
    values (
      ${projectId},
      ${org.tenantId},
      ${org.id},
      ${PROJECT_NAME},
      'SALESFORCE',
      'AI Readiness',
      ${"Determine whether Northern Peak can safely adopt Agentforce for service and operations, and what must be true before a first production use case."},
      ${sql.json([
        "Accelerate AI adoption",
        "Improve customer experience",
        "Automate manual processes",
      ])},
      null,
      ${owner.id},
      'Active',
      ${"Baseline Salesforce readiness for a first Agentforce use case in Wealth Service. Discovery should reuse the connected production org; scoring and value modeling come after this run."},
      'Wealth Management',
      'Client Service',
      'Elena Voss, COO',
      'Marcus Hale, Head of Service Operations',
      ${targetDateIso},
      'High',
      ${"A scored readiness baseline, three prioritized service opportunities, and a go / no-go recommendation for a 90-day Agentforce pilot."},
      ${"Sample project for layout and capability work. Not a live customer engagement."},
      false,
      now(),
      now()
    )
  `;

  await sql`
    insert into "ProjectPlatformScope" (
      id, "tenantId", "projectId", "platformType", "createdAt"
    )
    values (
      ${crypto.randomUUID()},
      ${org.tenantId},
      ${projectId},
      'SALESFORCE',
      now()
    )
  `;

  await sql`
    insert into "ProjectEnvironmentScope" (
      id, "tenantId", "projectId", "connectionId", "createdAt"
    )
    values (
      ${crypto.randomUUID()},
      ${org.tenantId},
      ${projectId},
      ${connection.id},
      now()
    )
  `;

  console.log(`Seeded ${PROJECT_NAME} for ${org.name}`);
  console.log(`Owner: ${owner.name} <${owner.email}>`);
  console.log(`http://localhost:3000/projects/${projectId}`);
}

main()
  .then(async () => {
    await sql.end();
  })
  .catch(async (error) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });
