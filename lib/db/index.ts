import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as appSchema from "./schema";
import * as authSchema from "./auth-schema";

const schema = { ...appSchema, ...authSchema };
type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __calabashDb?: Db };

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for Better Auth / Drizzle");
  }

  const client = postgres(url, {
    prepare: false,
    max: 10,
  });

  return drizzle(client, { schema });
}

export function getDb(): Db {
  if (!globalForDb.__calabashDb) {
    globalForDb.__calabashDb = createDb();
  }
  return globalForDb.__calabashDb;
}

/** Lazy proxy so importing this module during `next build` does not require DATABASE_URL. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
