import { and, asc, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, professionals, sessions, users } from "../../../../db/schema";
import { requirePermission } from "../../../../lib/admin";
import { hashPassword } from "../../../../lib/auth";
import { normalizeWhatsapp } from "../../../../lib/masks";
import { internalRoles, isInternalRole } from "../../../../lib/permissions";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function availableProfessional(db: Awaited<ReturnType<typeof getDb>>, professionalId: string, userId?: string) {
  if (!professionalId) return true;
  const [professional] = await db.select({ id: professionals.id, userId: professionals.userId })
    .from(professionals).where(eq(professionals.id, professionalId)).limit(1);
  return Boolean(professional && (!professional.userId || professional.userId === userId));
}

export async function GET(request: Request) {
  try {
    const admin = await requirePermission(request, "users");
    if (!admin) return noStore({ message: "Acesso restrito à gestão de usuários." }, 403);
    const db = await getDb();
    const [userRows, professionalRows] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        professionalId: professionals.id,
        professionalName: professionals.name,
      }).from(users)
        .leftJoin(professionals, eq(professionals.userId, users.id))
        .where(inArray(users.role, [...internalRoles]))
        .orderBy(asc(users.name)),
      db.select({ id: professionals.id, name: professionals.name, title: professionals.title, userId: professionals.userId, active: professionals.active })
        .from(professionals).orderBy(asc(professionals.name)),
    ]);
    return noStore({ users: userRows, professionals: professionalRows, currentUserId: admin.id });
  } catch {
    return noStore({ message: "Não foi possível carregar os usuários internos." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission(request, "users");
    if (!admin) return noStore({ message: "Acesso restrito à gestão de usuários." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Revise os dados do usuário." }, 400);

    const name = text(body.name, 120);
    const email = text(body.email, 160).toLowerCase();
    const phone = normalizeWhatsapp(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    const role = text(body.role, 20);
    const professionalId = text(body.professionalId, 120);
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !phone || password.length < 8 || password.length > 128 || !isInternalRole(role)) {
      return noStore({ message: "Informe nome, e-mail, WhatsApp, cargo e senha com pelo menos 8 caracteres." }, 400);
    }

    const db = await getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return noStore({ message: "Já existe uma conta com este e-mail." }, 409);
    if (!(await availableProfessional(db, professionalId))) return noStore({ message: "A profissional selecionada já possui um usuário vinculado." }, 409);

    const id = crypto.randomUUID();
    const userValues = { id, name, email, phone, passwordHash: await hashPassword(password), role, status: "active" };
    if (professionalId) {
      await db.batch([
        db.insert(users).values(userValues),
        db.update(professionals).set({ userId: id, updatedAt: new Date() }).where(and(eq(professionals.id, professionalId), isNull(professionals.userId))),
        db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "internal_user.created", entity: "user", entityId: id, metadata: { role, professionalId } }),
      ]);
    } else {
      await db.batch([
        db.insert(users).values(userValues),
        db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "internal_user.created", entity: "user", entityId: id, metadata: { role } }),
      ]);
    }
    return noStore({ message: "Usuário interno criado com sucesso." }, 201);
  } catch {
    return noStore({ message: "Não foi possível criar o usuário interno." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requirePermission(request, "users");
    if (!admin) return noStore({ message: "Acesso restrito à gestão de usuários." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Revise os dados do usuário." }, 400);

    const id = text(body.id, 120);
    const name = text(body.name, 120);
    const email = text(body.email, 160).toLowerCase();
    const phone = normalizeWhatsapp(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    const role = text(body.role, 20);
    const status = text(body.status, 20);
    const professionalId = text(body.professionalId, 120);
    if (!id || name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !phone || (password && (password.length < 8 || password.length > 128)) || !isInternalRole(role) || !["active", "inactive"].includes(status)) {
      return noStore({ message: "Revise nome, e-mail, WhatsApp, cargo, status e senha." }, 400);
    }
    if (id === admin.id && (role !== admin.role || status !== "active")) return noStore({ message: "Você não pode alterar o próprio cargo nem inativar sua conta." }, 409);

    const db = await getDb();
    const [current] = await db.select({ id: users.id, role: users.role, status: users.status }).from(users).where(and(eq(users.id, id), inArray(users.role, [...internalRoles]))).limit(1);
    if (!current) return noStore({ message: "Usuário interno não encontrado." }, 404);
    const [duplicate] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), ne(users.id, id))).limit(1);
    if (duplicate) return noStore({ message: "Já existe uma conta com este e-mail." }, 409);
    if (!(await availableProfessional(db, professionalId, id))) return noStore({ message: "A profissional selecionada já possui outro usuário vinculado." }, 409);

    if (current.role === "admin" && current.status === "active" && (role !== "admin" || status !== "active")) {
      const [remaining] = await db.select({ value: count() }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, id)));
      if (!remaining || remaining.value < 1) return noStore({ message: "O último administrador ativo não pode ser removido." }, 409);
    }

    const values: { name: string; email: string; phone: string; role: string; status: string; updatedAt: Date; passwordHash?: string } = { name, email, phone, role, status, updatedAt: new Date() };
    if (password) values.passwordHash = await hashPassword(password);
    await db.update(users).set(values).where(eq(users.id, id));
    await db.update(professionals).set({ userId: null, updatedAt: new Date() }).where(eq(professionals.userId, id));
    if (professionalId) await db.update(professionals).set({ userId: id, updatedAt: new Date() }).where(eq(professionals.id, professionalId));
    if (password || status === "inactive") await db.delete(sessions).where(eq(sessions.userId, id));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "internal_user.updated", entity: "user", entityId: id, metadata: { role, status, professionalId: professionalId || null, passwordReset: Boolean(password) } });
    return noStore({ message: "Usuário interno atualizado com sucesso." });
  } catch {
    return noStore({ message: "Não foi possível atualizar o usuário interno." }, 500);
  }
}
