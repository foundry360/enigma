import "server-only";

import postgres from "postgres";

function createSql() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return postgres(url, {
    prepare: false,
    max: 10,
  });
}

const globalForSql = globalThis as unknown as {
  sql?: ReturnType<typeof createSql>;
};

export const sql = globalForSql.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}

export function createId() {
  return crypto.randomUUID();
}
