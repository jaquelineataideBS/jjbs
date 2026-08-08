import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!databaseUrl || !email) throw new Error("DATABASE_URL and ADMIN_EMAIL are required.");

const sql = neon(databaseUrl);
const result = await sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = ${email} RETURNING id, name, email, role`;
if (!result[0]) throw new Error("No user found for ADMIN_EMAIL. Create the account first, then run this command again.");

console.log(`Admin access granted to ${result[0].email}.`);
