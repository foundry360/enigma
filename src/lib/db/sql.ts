import "server-only";

import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

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
  sql?: Sql;
};

function getSql() {
  if (!globalForSql.sql) {
    globalForSql.sql = createSql();
  }

  return globalForSql.sql;
}

export const sql: Sql = new Proxy(function sqlProxy() {} as unknown as Sql, {
  apply(_target, thisArg, args) {
    return Reflect.apply(getSql(), thisArg, args);
  },
  get(_target, prop) {
    const client = getSql();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function createId() {
  return crypto.randomUUID();
}
