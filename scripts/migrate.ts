import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const dir = path.join(process.cwd(), "sql/migrations");
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (await sql<{ id: string }[]>`select id from schema_migrations`).map(
      (row) => row.id,
    ),
  );

  const tables = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'User'
    ) as exists
  `;

  if (tables[0]?.exists && applied.size === 0) {
    for (const file of files) {
      await sql`insert into schema_migrations (id) values (${file})`;
      applied.add(file);
    }
  }

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const contents = await readFile(path.join(dir, file), "utf8");
    await sql.unsafe(contents);
    await sql`insert into schema_migrations (id) values (${file})`;
    console.log(`applied ${file}`);
  }
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
