import { and, eq, inArray } from "drizzle-orm";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { getDb } from "../db";
import { clients, notifications, pushInstallations, users } from "../db/schema";

const firebaseProjectId = "jaquelinebeauty-4d5d7";

export type PushNotice = {
  title: string;
  body: string;
  url: string;
};

function getFirebaseAdminApp() {
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credentials) return null;

  const parsedCredentials = JSON.parse(credentials) as ServiceAccount & { project_id?: string };
  if ((parsedCredentials.projectId && parsedCredentials.projectId !== firebaseProjectId) ||
    (parsedCredentials.project_id && parsedCredentials.project_id !== firebaseProjectId)) {
    throw new Error("Firebase service account project does not match the web app.");
  }

  return getApps().find((app) => app.name === "jaqueline-beauty-push") ??
    initializeApp(
      { credential: cert(parsedCredentials), projectId: firebaseProjectId },
      "jaqueline-beauty-push",
    );
}

export async function sendPushToUsers(userIds: string[], notice: PushNotice) {
  if (!userIds.length || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return 0;
  const db = await getDb();
  const installations = await db
    .select({ fid: pushInstallations.fid })
    .from(pushInstallations)
    .where(inArray(pushInstallations.userId, [...new Set(userIds)].slice(0, 1000)))
    .limit(500);
  if (!installations.length) return 0;

  const app = getFirebaseAdminApp();
  if (!app) return 0;
  const messaging = getMessaging(app);
  const messages: Message[] = installations.map(({ fid }) => ({
    fid,
    data: {
      title: notice.title.slice(0, 120),
      body: notice.body.slice(0, 400),
      url: notice.url,
    },
    webpush: { headers: { Urgency: "high" } },
  }));
  const result = await messaging.sendEach(messages);

  const invalidFids = result.responses.flatMap((response, index) =>
    !response.success && response.error?.code === "messaging/registration-token-not-registered"
      ? [installations[index].fid]
      : [],
  );
  if (invalidFids.length) {
    await db.delete(pushInstallations).where(inArray(pushInstallations.fid, invalidFids));
  }
  return result.successCount;
}

export async function sendAppointmentPush(userIds: string[], notice: PushNotice) {
  try {
    return await sendPushToUsers(userIds, notice);
  } catch {
    // Push delivery is best effort; the appointment and its in-app notice stay saved in Neon.
    return 0;
  }
}

export async function announcePromotion(
  promotion: { id: string; title: string; description: string; couponCode: string | null },
  createdBy: string,
) {
  const db = await getDb();
  const eligibleClients = await db
    .select({ userId: clients.userId })
    .from(clients)
    .innerJoin(users, eq(users.id, clients.userId))
    .where(and(
      eq(clients.active, true),
      eq(clients.marketingConsent, true),
      eq(users.status, "active"),
      eq(users.role, "client"),
    ))
    .limit(2000);
  const userIds = [...new Set(eligibleClients.flatMap((client) => client.userId ? [client.userId] : []))];
  if (!userIds.length) return { recipients: 0, pushed: 0 };

  const title = promotion.couponCode ? "Novo cupom para você" : "Nova promoção no studio";
  const detail = promotion.couponCode ? ` Use o cupom ${promotion.couponCode}.` : " Confira os detalhes no app.";
  const message = `${promotion.title}: ${promotion.description}${detail}`.slice(0, 900);
  const createdAt = new Date();
  for (let offset = 0; offset < userIds.length; offset += 100) {
    const batch = userIds.slice(offset, offset + 100);
    await db.insert(notifications).values(batch.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type: "promotion",
      channel: "in_app",
      status: "sent",
      sentAt: createdAt,
      createdBy,
    })));
  }

  let pushed = 0;
  try {
    pushed = await sendPushToUsers(userIds, {
      title,
      body: `${promotion.title}${promotion.couponCode ? ` · Cupom ${promotion.couponCode}` : ""}`,
      url: "/promocoes",
    });
  } catch {
    // The promotion remains published and the in-app notices remain available if push is offline.
  }
  return { recipients: userIds.length, pushed };
}
