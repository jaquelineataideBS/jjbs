import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  appointmentServices,
  appointments,
  auditLogs,
  clients,
  professionals,
  services,
  users,
} from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { todayInFortaleza } from "../../../../lib/scheduling";

type ClientInput = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  preferences: string | null;
  allergies: string | null;
  notes: string | null;
  photoConsent: boolean;
  marketingConsent: boolean;
  active: boolean;
};

const cancelledStatuses = new Set([
  "cancelled_by_client",
  "cancelled_by_salon",
  "rescheduled",
]);

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : text ? undefined : null;
}

function parseClient(value: unknown): ClientInput | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const phone = typeof value.phone === "string" ? value.phone.trim() : "";
  const whatsapp =
    typeof value.whatsapp === "string" ? value.whatsapp.trim() : phone;
  const emailValue = optionalText(value.email, 160);
  const birthDate = optionalText(value.birthDate, 10);
  const address = optionalText(value.address, 300);
  const preferences = optionalText(value.preferences, 1000);
  const allergies = optionalText(value.allergies, 1000);
  const notes = optionalText(value.notes, 2000);

  if (
    name.length < 2 ||
    name.length > 120 ||
    phone.replace(/\D/g, "").length < 8 ||
    phone.length > 30
  )
    return null;
  if (whatsapp.replace(/\D/g, "").length < 8 || whatsapp.length > 30)
    return null;
  if (
    emailValue === undefined ||
    (emailValue && !/^\S+@\S+\.\S+$/.test(emailValue))
  )
    return null;
  if (
    birthDate === undefined ||
    (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
  )
    return null;
  if ([address, preferences, allergies, notes].includes(undefined)) return null;

  return {
    id,
    name,
    phone,
    whatsapp,
    email: emailValue?.toLowerCase() ?? null,
    birthDate: birthDate ?? null,
    address: address ?? null,
    preferences: preferences ?? null,
    allergies: allergies ?? null,
    notes: notes ?? null,
    photoConsent: value.photoConsent === true,
    marketingConsent: value.marketingConsent === true,
    active: value.active !== false,
  };
}

function clientValues(input: ClientInput) {
  return {
    name: input.name,
    phone: input.phone,
    whatsapp: input.whatsapp,
    email: input.email,
    birthDate: input.birthDate,
    address: input.address,
    preferences: input.preferences,
    allergies: input.allergies,
    notes: input.notes,
    photoConsent: input.photoConsent,
    marketingConsent: input.marketingConsent,
    active: input.active,
  };
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const db = await getDb();
    const url = new URL(request.url);
    const requestedId = url.searchParams.get("id")?.trim();

    if (requestedId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, requestedId))
        .limit(1);
      if (!client) return noStore({ message: "Cliente não encontrada." }, 404);
      const history = await db
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          startTime: appointments.startTime,
          status: appointments.status,
          totalEstimatedCents: appointments.totalEstimatedCents,
          serviceName: services.name,
          professionalName: professionals.name,
        })
        .from(appointments)
        .leftJoin(
          appointmentServices,
          eq(appointmentServices.appointmentId, appointments.id),
        )
        .leftJoin(services, eq(services.id, appointmentServices.serviceId))
        .leftJoin(
          professionals,
          eq(professionals.id, appointments.professionalId),
        )
        .where(eq(appointments.clientId, requestedId))
        .orderBy(
          desc(appointments.appointmentDate),
          desc(appointments.startTime),
        )
        .limit(30);
      return noStore({
        client: { ...client, linkedAccount: Boolean(client.userId) },
        history,
      });
    }

    const query = (url.searchParams.get("q") ?? "")
      .trim()
      .toLocaleLowerCase("pt-BR")
      .slice(0, 80);
    const clientRows = await db
      .select()
      .from(clients)
      .orderBy(asc(clients.name))
      .limit(300);
    const clientIds = clientRows.map((client) => client.id);
    const appointmentRows = clientIds.length
      ? await db
          .select({
            id: appointments.id,
            clientId: appointments.clientId,
            appointmentDate: appointments.appointmentDate,
            startTime: appointments.startTime,
            status: appointments.status,
            totalEstimatedCents: appointments.totalEstimatedCents,
          })
          .from(appointments)
          .where(inArray(appointments.clientId, clientIds))
          .orderBy(
            desc(appointments.appointmentDate),
            desc(appointments.startTime),
          )
          .limit(3000)
      : [];

    const today = todayInFortaleza();
    const summaries = new Map<
      string,
      {
        attendanceCount: number;
        totalSpentCents: number;
        lastAppointment: string | null;
        nextAppointment: string | null;
      }
    >();
    for (const row of appointmentRows) {
      const summary = summaries.get(row.clientId) ?? {
        attendanceCount: 0,
        totalSpentCents: 0,
        lastAppointment: null,
        nextAppointment: null,
      };
      if (row.status === "completed") {
        summary.attendanceCount += 1;
        summary.totalSpentCents += row.totalEstimatedCents ?? 0;
        if (
          !summary.lastAppointment ||
          row.appointmentDate > summary.lastAppointment
        )
          summary.lastAppointment = row.appointmentDate;
      }
      if (
        row.appointmentDate >= today &&
        !cancelledStatuses.has(row.status) &&
        (!summary.nextAppointment ||
          row.appointmentDate < summary.nextAppointment)
      )
        summary.nextAppointment = row.appointmentDate;
      summaries.set(row.clientId, summary);
    }

    const rows = clientRows
      .filter(
        (client) =>
          !query ||
          [client.name, client.phone, client.whatsapp, client.email].some(
            (value) => value?.toLocaleLowerCase("pt-BR").includes(query),
          ),
      )
      .slice(0, 100)
      .map((client) => ({
        ...client,
        linkedAccount: Boolean(client.userId),
        ...(summaries.get(client.id) ?? {
          attendanceCount: 0,
          totalSpentCents: 0,
          lastAppointment: null,
          nextAppointment: null,
        }),
      }));
    return noStore({ clients: rows, total: rows.length });
  } catch {
    return noStore({ message: "Não foi possível carregar as clientes." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin)
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const input = parseClient(await request.json());
    if (!input)
      return noStore(
        {
          message:
            "Revise nome, telefone, WhatsApp e os demais dados da cliente.",
        },
        400,
      );
    const db = await getDb();
    const duplicateConditions = [
      eq(clients.phone, input.phone),
      eq(clients.whatsapp, input.whatsapp),
    ];
    if (input.email) duplicateConditions.push(eq(clients.email, input.email));
    const [duplicate] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(or(...duplicateConditions))
      .limit(1);
    if (duplicate)
      return noStore(
        {
          message:
            "Já existe uma cliente com este telefone, WhatsApp ou e-mail.",
        },
        409,
      );
    const id = crypto.randomUUID();
    const [client] = await db.batch([
      db
        .insert(clients)
        .values({ id, ...clientValues(input) })
        .returning(),
      db
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          userId: admin.id,
          action: "client.created",
          entity: "client",
          entityId: id,
          metadata: { fields: Object.keys(clientValues(input)) },
        }),
    ]);
    return noStore(
      { client: client[0], message: "Cliente cadastrada com sucesso." },
      201,
    );
  } catch {
    return noStore({ message: "Não foi possível cadastrar a cliente." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin)
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const input = parseClient(await request.json());
    if (!input?.id)
      return noStore({ message: "Revise os dados da cliente." }, 400);
    const db = await getDb();
    const [current] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, input.id))
      .limit(1);
    if (!current) return noStore({ message: "Cliente não encontrada." }, 404);

    if (current.userId && !input.email)
      return noStore(
        {
          message:
            "O e-mail não pode ser removido de uma cliente que possui conta de acesso.",
        },
        400,
      );
    if (current.userId && input.email) {
      const [emailOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, current.userId)))
        .limit(1);
      if (emailOwner)
        return noStore(
          { message: "Este e-mail já está vinculado a outra conta." },
          409,
        );
    }

    const changedFields = Object.entries(clientValues(input))
      .filter(([key, value]) => current[key as keyof typeof current] !== value)
      .map(([key]) => key);
    const updateClient = db
      .update(clients)
      .set({ ...clientValues(input), updatedAt: new Date() })
      .where(eq(clients.id, input.id))
      .returning();
    const writeAudit = db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "client.updated",
      entity: "client",
      entityId: input.id,
      metadata: { changedFields },
    });
    const [updated] = current.userId && input.email
      ? await db.batch([
          updateClient,
          writeAudit,
          db.update(users).set({ name: input.name, email: input.email, phone: input.phone, updatedAt: new Date() }).where(eq(users.id, current.userId)),
        ])
      : await db.batch([updateClient, writeAudit]);
    return noStore({
      client: Array.isArray(updated) ? updated[0] : updated,
      message: "Dados da cliente atualizados.",
    });
  } catch {
    return noStore({ message: "Não foi possível atualizar a cliente." }, 500);
  }
}
