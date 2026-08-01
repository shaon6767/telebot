import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

/**
 * A pooled connection, not a single client — the webhook handler and the
 * cron job both need concurrent DB access, and a single client would
 * serialize them unnecessarily.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });
