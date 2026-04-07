// src/server/db/db.ts

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Guard: env must exist
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Prevent duplicate pools in dev
const globalForDb = globalThis as unknown as {
  __PG_POOL__?: Pool;
  __DRIZZLE_DB__?: ReturnType<typeof drizzle>;
};

const pool =
  globalForDb.__PG_POOL__ ??
  new Pool({
    connectionString: DATABASE_URL,

    ssl: false,

    max: 30,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15000, 
  });

const db =
  globalForDb.__DRIZZLE_DB__ ??
  drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__PG_POOL__ = pool;
  globalForDb.__DRIZZLE_DB__ = db;
}

export { db, pool, schema };