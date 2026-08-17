import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const sql = postgres(url, { prepare: false, max: 1 });

const ORG_NAME = "Meridian Health Partners";
const PROJECT_NAME = "Patient Service AI Opportunity";

async function main() {
  const [tenant] = await sql<{ id: string }[]>`
    select id
    from "Tenant"
    order by "createdAt" asc
    limit 1
  `;

  if (!tenant) {
    console.error("No tenant found. Sign in once so a workspace exists.");
    process.exit(1);
  }

  const [owner] = await sql<{ id: string; name: string; email: string }[]>`
    select id, name, email
    from "User"
    where "tenantId" = ${tenant.id}
    order by "createdAt" asc
    limit 1
  `;

  if (!owner) {
    console.error(`No users on tenant ${tenant.id}`);
    process.exit(1);
  }

  let [organization] = await sql<{ id: string; name: string }[]>`
    select id, name
    from "Organization"
    where "tenantId" = ${tenant.id} and name = ${ORG_NAME}
    limit 1
  `;

  if (!organization) {
    const organizationId = crypto.randomUUID();
    const [created] = await sql<{ id: string; name: string }[]>`
      insert into "Organization" (
        id, "tenantId", name, industry, "organizationType", "employeeRange",
        "primaryContact", "customerStatus", disabled, "createdAt", "updatedAt"
      )
      values (
        ${organizationId},
        ${tenant.id},
        ${ORG_NAME},
        'Healthcare',
        'Mid-market',
        '1,001–5,000',
        'Priya Shah',
        'Active',
        false,
        now(),
        now()
      )
      returning id, name
    `;
    organization = created;

    await sql`
      insert into "AuditLog" (
        id, "tenantId", "userId", action, entity, "entityId", metadata, "createdAt"
      )
      values (
        ${crypto.randomUUID()},
        ${tenant.id},
        ${owner.id},
        'organization.create',
        'Organization',
        ${organization.id},
        ${sql.json({ name: ORG_NAME })},
        now()
      )
    `;
    console.log(`Created organization ${organization.id}`);
  } else {
    console.log(`Organization already exists: ${organization.id}`);
  }

  let [connection] = await sql<{ id: string }[]>`
    select id
    from "PlatformConnection"
    where "organizationId" = ${organization.id} and "platformType" = 'SALESFORCE'
    order by "updatedAt" desc
    limit 1
  `;

  if (!connection) {
    const connectionId = crypto.randomUUID();
    const [created] = await sql<{ id: string }[]>`
      insert into "PlatformConnection" (
        id, "tenantId", "organizationId", "platformType", status,
        "externalOrgId", "externalOrgName", "connectedAt", "createdAt", "updatedAt"
      )
      values (
        ${connectionId},
        ${tenant.id},
        ${organization.id},
        'SALESFORCE',
        'CONNECTED',
        '00D000000000002AAA',
        'Meridian Health Partners — Production',
        now(),
        now(),
        now()
      )
      returning id
    `;
    connection = created;
    console.log(`Created Salesforce connection ${connection.id}`);
  }

  let [project] = await sql<{ id: string }[]>`
    select id
    from "Project"
    where "organizationId" = ${organization.id} and name = ${PROJECT_NAME}
    limit 1
  `;

  if (project) {
    console.log(`Project already exists: ${project.id}`);
    console.log(`http://localhost:3000/accounts/${organization.id}`);
    console.log(`http://localhost:3000/projects/${project.id}`);
    return;
  }

  const projectId = crypto.randomUUID();
  const targetDate = new Date();
  targetDate.setUTCMonth(targetDate.getUTCMonth() + 4);
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
      ${tenant.id},
      ${organization.id},
      ${PROJECT_NAME},
      'SALESFORCE',
      'AI Opportunity Assessment',
      ${"Find the first patient-service use cases where AI can reduce call handle time and improve access without adding clinical risk."},
      ${sql.json([
        "Improve customer experience",
        "Reduce operational cost",
        "Automate manual processes",
      ])},
      null,
      ${owner.id},
      'Planning',
      ${"Opportunity assessment for contact-center and care-coordination work. Discovery should use the connected production org; scoring comes after this run."},
      'Patient Experience',
      'Contact Center',
      'Dr. Helen Cho, CMO',
      'Priya Shah, VP Patient Access',
      ${targetDateIso},
      'Medium',
      ${"A short list of credible service opportunities, volume assumptions, and a recommended first pilot."},
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
      ${tenant.id},
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
      ${tenant.id},
      ${projectId},
      ${connection.id},
      now()
    )
  `;

  await sql`
    insert into "AuditLog" (
      id, "tenantId", "userId", action, entity, "entityId", metadata, "createdAt"
    )
    values (
      ${crypto.randomUUID()},
      ${tenant.id},
      ${owner.id},
      'project.create',
      'Project',
      ${projectId},
      ${sql.json({
        name: PROJECT_NAME,
        organizationId: organization.id,
        projectType: "AI Opportunity Assessment",
      })},
      now()
    )
  `;

  console.log(`Seeded ${PROJECT_NAME} for ${ORG_NAME}`);
  console.log(`Owner: ${owner.name} <${owner.email}>`);
  console.log(`http://localhost:3000/accounts/${organization.id}`);
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
