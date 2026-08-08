import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function localDatabaseUrl() {
  const runtimeProcess = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process;
  return runtimeProcess?.env?.DATABASE_URL;
}

export async function getDatabaseUrl() {
  // Vercel provides runtime variables through process.env. Keeping this lookup
  // free of Cloudflare-only module imports lets the same app compile on Vercel.
  return localDatabaseUrl();
}

export async function getDb() {
  const databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Neon DATABASE_URL is unavailable. Configure DATABASE_URL in the runtime environment before using the database.");
  }

  return drizzle(neon(databaseUrl), { schema });
}
