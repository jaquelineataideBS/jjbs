import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.RESET_EMAIL?.trim().toLowerCase();
const siteUrl = (process.env.SITE_URL ?? "http://127.0.0.1:3030").replace(/\/$/, "");
if (!databaseUrl || !email) throw new Error("DATABASE_URL and RESET_EMAIL are required.");

const sql = neon(databaseUrl);
const users = await sql`SELECT id, email FROM users WHERE lower(email) = ${email} AND status = 'active' LIMIT 1`;
if (!users[0]) throw new Error("No active user found for RESET_EMAIL.");

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("base64url");
const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${users[0].id} AND used_at IS NULL`;
await sql`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (${randomUUID()}, ${users[0].id}, ${tokenHash}, ${expiresAt})`;
console.log(`${siteUrl}/redefinir-senha?token=${encodeURIComponent(token)}`);
