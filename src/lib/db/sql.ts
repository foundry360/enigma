import "server-only";

import postgres from "postgres";
import { toUtcDate } from "@/lib/format";

type Sql = ReturnType<typeof postgres>;

function createSql() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return postgres(url, {
    prepare: false,
    max: 10,
    types: {
      date: {
        to: 1184,
        from: [1082, 1114, 1184],
        serialize: (value: Date | string) =>
          (value instanceof Date ? value : new Date(value)).toISOString(),
        parse: toUtcDate,
      },
    },
  });
}

const SQL_CLIENT_VERSION = 2;

const globalForSql = globalThis as unknown as {
  sql?: Sql;
  sqlVersion?: number;
};

function getSql() {
  if (!globalForSql.sql || globalForSql.sqlVersion !== SQL_CLIENT_VERSION) {
    globalForSql.sql = createSql();
    globalForSql.sqlVersion = SQL_CLIENT_VERSION;
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
