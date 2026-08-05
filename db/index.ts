import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type RuntimeEnv = {
  DATABASE_URL?: string;
  DB?: unknown;
};

function localDatabaseUrl() {
  const runtimeProcess = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process;
  return runtimeProcess?.env?.DATABASE_URL;
}

export async function getDatabaseUrl() {
  const localUrl = localDatabaseUrl();
  if (localUrl) return localUrl;

  try {
    const runtime = await import("cloudflare:workers") as { env?: RuntimeEnv };
    return runtime.env?.DATABASE_URL;
  } catch {
    return undefined;
  }
}

export async function getDb() {
  const databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Neon DATABASE_URL is unavailable. Configure DATABASE_URL in the runtime environment before using the database.");
  }

  return drizzle(neon(databaseUrl), { schema });
}
