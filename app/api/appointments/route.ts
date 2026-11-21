import { and, eq, gt, inArray, lt, ne, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentServices, appointments, businessHours, openScheduleDates, professionalServices, clients, notifications, professionals, services, users } from "../../../db/schema";
import { getCurrentUser } from "../../../lib/auth";
import { normalizeWhatsapp } from "../../../lib/masks";
import { normalizeCoupon, validateCoupon } from "../../../lib/promotions";
import { getPublicSettings } from "../../../lib/public-settings";
import { sendAppointmentPush } from "../../../lib/firebase-push";
import { internalRoles } from "../../../lib/permissions";
import { addMinutes, buildConfiguredStartSlots, isClockTime, todayInFortaleza, weekdayForDate } from "../../../lib/scheduling";
import { isHairSize, priceForHairSize, type HairSize } from "../../../lib/hair-sizes";

const blockedStatuses = ["cancelled_by_client", "cancelled_by_salon", "rescheduled"];

type BookingPayload = {
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  startTime: string;
  hairSize: HairSize;
  clientId?: string;
  rescheduleId?: string;
  couponCode?: string;
  client: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePayload(value: unknown): BookingPayload | null {
  if (!isRecord(value) || !isRecord(value.client)) return null;

  const serviceId = typeof value.serviceId === "string" ? value.serviceId.trim() : "";
  const professionalId = typeof value.professionalId === "string" ? value.professionalId.trim() : "";
  const appointmentDate = typeof value.appointmentDate === "string" ? value.appointmentDate.trim() : "";
  const startTime = typeof value.startTime === "string" ? value.startTime.trim() : "";
  const hairSize = value.hairSize;
  const clientId = typeof value.clientId === "string" ? value.clientId.trim() : "";
  const rescheduleId = typeof value.rescheduleId === "string" ? value.rescheduleId.trim() : "";
  const couponCode = normalizeCoupon(value.couponCode);
  const clientName = typeof value.client.name === "string" ? value.client.name.trim() : "";
  const phone = normalizeWhatsapp(value.client.phone);
  const email = typeof value.client.email === "string" ? value.client.email.trim() : "";
  const notes = typeof value.client.notes === "string" ? value.client.notes.trim() : "";

  if ((value.clientId !== undefined && typeof value.clientId !== "string") || !serviceId || !professionalId || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !isClockTime(startTime) || !isHairSize(hairSize)) return null;
  if (clientName.length < 2 || clientName.length > 120 || !phone) return null;
  if (email && (email.length > 160 || !/^\S+@\S+\.\S+$/.test(email))) return null;
  if (notes.length > 500) return null;

  return {
    serviceId,
    professionalId,
    appointmentDate,
    startTime,
    hairSize,
    clientId: clientId || undefined,
    rescheduleId: rescheduleId || undefined,
    couponCode: couponCode || undefined,
    client: { name: clientName, phone, email: email || undefined, notes: notes || undefined },
  };
}

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: BookingPayload | null;

  try {
    payload = parsePayload(await request.json());
  } catch {
    return json({ message: "Não foi possível ler os dados do agendamento." }, 400);
  }

  if (!payload) {
    return json({ message: "Revise os dados obrigatórios do agendamento." }, 400);
  }
  if (payload.appointmentDate < todayInFortaleza()) return json({ message: "Escolha uma data futura para o agendamento." }, 400);

  try {
    const db = await getDb();
    const currentUser = await getCurrentUser(request);
    if (payload.clientId && payload.rescheduleId) return json({ message: "Selecione o cadastro de cliente antes de iniciar um novo agendamento." }, 400);
    if (payload.clientId && (!currentUser || !internalRoles.includes(currentUser.role as (typeof internalRoles)[number]))) {
      return json({ message: "Somente a equipe do studio pode selecionar um cadastro de cliente." }, 403);
    }
    const [selectedClient] = payload.clientId
      ? await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, payload.clientId), eq(clients.active, true))).limit(1)
      : [];
    if (payload.clientId && !selectedClient) return json({ message: "O cadastro selecionado não está mais ativo." }, 404);
    const settings = await getPublicSettings();
    const nowTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const [rescheduledAppointment] = payload.rescheduleId && currentUser
      ? await db.select({ id: appointments.id, clientId: appointments.clientId, appointmentDate: appointments.appointmentDate, startTime: appointments.startTime, status: appointments.status })
        .from(appointments)
        .innerJoin(clients, eq(clients.id, appointments.clientId))
        .where(and(eq(appointments.id, payload.rescheduleId), eq(clients.userId, currentUser.id)))
        .limit(1)
      : [];
    if (payload.rescheduleId && !currentUser) return json({ message: "Entre na sua conta para reagendar um atendimento." }, 401);
    if (payload.rescheduleId && !settings.rescheduleAllowed) return json({ message: "O reagendamento pela área da cliente está desativado. Fale com o studio." }, 409);
    if (payload.rescheduleId && !rescheduledAppointment) return json({ message: "O agendamento original não foi encontrado na sua conta." }, 404);
    if (rescheduledAppointment && (!["pending_confirmation", "confirmed"].includes(rescheduledAppointment.status)
      || rescheduledAppointment.appointmentDate < todayInFortaleza()
      || (rescheduledAppointment.appointmentDate === todayInFortaleza() && rescheduledAppointment.startTime <= nowTime))) {
      return json({ message: "Este agendamento não pode mais ser reagendado pela área da cliente." }, 409);
    }

    const [service] = await db.select().from(services).where(and(eq(services.id, payload.serviceId), eq(services.active, true))).limit(1);

    if (!service) {
      return json({ message: "Este serviço não está disponível para agendamento." }, 400);
    }

    const selectedPriceCents = priceForHairSize(service.sizePrices, payload.hairSize, service.priceCents);
    if (service.priceType !== "consultation" && selectedPriceCents === null) {
      return json({ message: `O valor para o tamanho ${payload.hairSize} ainda não foi configurado. Fale com o studio.` }, 409);
    }
    const appliedPromotion = payload.couponCode
      ? await validateCoupon(db, payload.couponCode, service.id, selectedPriceCents)
      : null;
    if (payload.couponCode && !appliedPromotion) {
      return json({ message: "O cupom informado não é mais válido para este serviço." }, 409);
    }

    const [professional] = await db.select({ id: professionals.id }).from(professionals)
      .where(and(eq(professionals.id, payload.professionalId), eq(professionals.active, true)))
      .limit(1);
    if (!professional) return json({ message: "A profissional escolhida não está ativa." }, 400);

    const [openDate] = await db.select({ id: openScheduleDates.id, serviceIds: openScheduleDates.serviceIds }).from(openScheduleDates).where(and(eq(openScheduleDates.professionalId, professional.id), eq(openScheduleDates.date, payload.appointmentDate))).limit(1);
    if (!openDate) {
      return json({ message: "Esta data ainda não foi liberada pela administração." }, 409);
    }
    if (openDate.serviceIds !== null && !openDate.serviceIds.includes(service.id)) {
      return json({ message: "Este serviço não está liberado para a data escolhida." }, 409);
    }
    const [professionalService] = await db.select({ id: professionalServices.id }).from(professionalServices)
      .where(and(eq(professionalServices.professionalId, professional.id), eq(professionalServices.serviceId, service.id))).limit(1);
    if (!professionalService) return json({ message: "Este serviço não está liberado para a profissional escolhida." }, 409);
    const endTime = addMinutes(payload.startTime, service.durationMinutes);
    if (!isClockTime(endTime)) return json({ message: "O atendimento não cabe nesse horário." }, 400);
    const hours = await db.select({ startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
      .from(businessHours)
      .where(and(eq(businessHours.professionalId, professional.id), eq(businessHours.weekday, weekdayForDate(payload.appointmentDate)), eq(businessHours.active, true)));
    const insideWorkingPeriod = buildConfiguredStartSlots(hours, service.durationMinutes, []).includes(payload.startTime);
    if (!insideWorkingPeriod) return json({ message: "O horário escolhido está fora do expediente da profissional." }, 400);

    const conflictRows = await db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.professionalId, professional.id),
      eq(appointments.appointmentDate, payload.appointmentDate),
      notInArray(appointments.status, blockedStatuses),
      lt(appointments.startTime, endTime),
      gt(appointments.endTime, payload.startTime),
      rescheduledAppointment ? ne(appointments.id, rescheduledAppointment.id) : undefined,
    )).limit(1);
    const conflict = conflictRows[0];

    if (conflict) {
      return json({ message: "Este horário acabou de ser reservado. Escolha outro horário disponível." }, 409);
    }

    const [linkedClient] = currentUser?.role === "client"
      ? await db.select({ id: clients.id }).from(clients).where(eq(clients.userId, currentUser.id)).limit(1)
      : [];
    const clientId = rescheduledAppointment?.clientId ?? linkedClient?.id ?? selectedClient?.id ?? crypto.randomUUID();
    const clientValues = {
      name: payload.client.name,
      phone: payload.client.phone,
      whatsapp: payload.client.phone,
      ...(payload.client.email ? { email: payload.client.email } : {}),
    };
    const appointmentId = crypto.randomUUID();
    const appointmentServiceId = crypto.randomUUID();

    const appointmentValues = {
      id: appointmentId,
      clientId,
      professionalId: professional.id,
      appointmentDate: payload.appointmentDate,
      startTime: payload.startTime,
      endTime,
      status: "pending_confirmation",
      hairSize: payload.hairSize,
      totalEstimatedCents: selectedPriceCents === null ? null : Math.max(0, selectedPriceCents - (appliedPromotion?.discountCents ?? 0)),
      promotionId: appliedPromotion?.id,
      couponCode: appliedPromotion?.couponCode,
      discountCents: appliedPromotion?.discountCents ?? 0,
      notesClient: payload.client.notes,
      source: "website",
    };
    const appointmentServiceValues = {
      id: appointmentServiceId,
      appointmentId,
      serviceId: service.id,
      priceCents: selectedPriceCents,
      durationMinutes: service.durationMinutes,
    };
    const studioUsers = await db.select({ id: users.id }).from(users).where(and(
      eq(users.status, "active"),
      inArray(users.role, [...internalRoles]),
    )).limit(100);
    const studioNotificationValues = studioUsers.map((studioUser) => ({
      id: crypto.randomUUID(),
      userId: studioUser.id,
      appointmentId,
      title: rescheduledAppointment ? "Novo pedido de reagendamento" : "Novo agendamento",
      message: `Chegou um pedido para ${payload.appointmentDate.split("-").reverse().join("/")}, às ${payload.startTime}. Abra a agenda para conferir.`,
      type: rescheduledAppointment ? "reschedule" : "appointment_request",
      channel: "in_app",
      status: "sent",
      sentAt: new Date(),
      createdBy: currentUser?.id ?? null,
    }));
    const appointmentNotification = currentUser
      ? db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: currentUser.id,
          appointmentId,
          title: rescheduledAppointment ? "Agendamento atualizado" : "Solicitação recebida",
          message: rescheduledAppointment
            ? `Seu horário para ${service.name} foi alterado para ${payload.appointmentDate.split("-").reverse().join("/")}, às ${payload.startTime}. O studio confirmará a disponibilidade.`
            : `Recebemos sua solicitação para ${service.name} em ${payload.appointmentDate.split("-").reverse().join("/")}, às ${payload.startTime}. O studio confirmará seu horário pelo WhatsApp.`,
          type: rescheduledAppointment ? "reschedule" : "confirmation",
          channel: "in_app",
          status: "sent",
          sentAt: new Date(),
        })
      : null;

    if (rescheduledAppointment) {
      await db.batch([
        db.update(clients).set(clientValues).where(eq(clients.id, clientId)),
        db.insert(appointments).values(appointmentValues),
        db.insert(appointmentServices).values(appointmentServiceValues),
        db.update(appointments).set({ status: "rescheduled", updatedAt: new Date() }).where(and(eq(appointments.id, rescheduledAppointment.id), inArray(appointments.status, ["pending_confirmation", "confirmed"]))),
        ...(appointmentNotification ? [appointmentNotification] : []),
        ...(studioNotificationValues.length ? [db.insert(notifications).values(studioNotificationValues)] : []),
      ]);
    } else if (linkedClient || selectedClient) {
      await db.batch([
        db.update(clients).set(clientValues).where(eq(clients.id, clientId)),
        db.insert(appointments).values(appointmentValues),
        db.insert(appointmentServices).values(appointmentServiceValues),
        ...(appointmentNotification ? [appointmentNotification] : []),
        ...(studioNotificationValues.length ? [db.insert(notifications).values(studioNotificationValues)] : []),
      ]);
    } else {
      await db.batch([
        db.insert(clients).values({
          id: clientId,
          userId: currentUser?.role === "client" ? currentUser.id : undefined,
          name: payload.client.name || (currentUser?.role === "client" ? currentUser.name : ""),
          phone: payload.client.phone || (currentUser?.role === "client" ? currentUser.phone ?? "" : ""),
          whatsapp: payload.client.phone || (currentUser?.role === "client" ? currentUser.phone ?? "" : ""),
          email: payload.client.email || (currentUser?.role === "client" ? currentUser.email : undefined),
          notes: payload.client.notes,
        }),
        db.insert(appointments).values(appointmentValues),
        db.insert(appointmentServices).values(appointmentServiceValues),
        ...(appointmentNotification ? [appointmentNotification] : []),
        ...(studioNotificationValues.length ? [db.insert(notifications).values(studioNotificationValues)] : []),
      ]);
    }

    await Promise.all([
      sendAppointmentPush(studioUsers.map((studioUser) => studioUser.id), {
        title: rescheduledAppointment ? "Novo pedido de reagendamento" : "Novo agendamento",
        body: `Novo pedido para ${payload.appointmentDate.split("-").reverse().join("/")}, às ${payload.startTime}.`,
        url: "/admin",
      }),
      ...(currentUser?.role === "client"
        ? [sendAppointmentPush([currentUser.id], {
            title: rescheduledAppointment ? "Pedido de reagendamento recebido" : "Pedido de agendamento recebido",
            body: `Seu pedido para ${service.name} em ${payload.appointmentDate.split("-").reverse().join("/")}, às ${payload.startTime}, foi recebido.`,
            url: "/minha-conta#notificacoes",
          })]
        : []),
    ]);

    return json({ appointmentId, status: "pending_confirmation", promotion: appliedPromotion, rescheduledFromId: rescheduledAppointment?.id }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("D1 binding") || message.includes("DB") || message.includes("cloudflare:") || message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) {
      return json({ message: "O banco de dados ainda não está conectado neste ambiente. A solicitação não foi gravada." }, 503);
    }

    return json({ message: "Não foi possível registrar o agendamento agora. Tente novamente em instantes." }, 500);
  }
}
