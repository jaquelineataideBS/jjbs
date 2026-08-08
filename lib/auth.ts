import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";

export const sessionCookieName = "jbs_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 30;
const passwordIterations = 120_000;
const encoder = new TextEncoder();

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: Uint8Array.from(salt), iterations: passwordIterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return `pbkdf2$${passwordIterations}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsValue, saltValue, hashValue] = storedHash.split("$");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2" || !Number.isSafeInteger(iterations) || iterations < 100_000 || !saltValue || !hashValue) return false;

  const actual = await derivePasswordHash(password, base64ToBytes(saltValue));
  const expected = base64ToBytes(hashValue);
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function createSessionToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  const token = createSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export function sessionCookie(token: string, request: Request, expiresAt: Date) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName}=${token}; Max-Age=${sessionLifetimeSeconds}; Expires=${expiresAt.toUTCString()}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax`;
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export async function getCurrentUser(request: Request) {
  const token = getCookie(request, sessionCookieName);
  if (!token) return null;

  const db = await getDb();
  const tokenHash = await hashToken(token);
  const [session] = await db.select().from(sessions).where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!session) return null;

  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

export async function removeCurrentSession(request: Request) {
  const token = getCookie(request, sessionCookieName);
  if (!token) return;

  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
}

export const authCookieMaxAge = sessionLifetimeSeconds;
