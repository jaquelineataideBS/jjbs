import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, loyaltyAccounts, loyaltyTransactions } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ message: "Faça login para consultar sua fidelidade." }, { status: 401 });
    const db = await getDb();
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.userId, user.id)).limit(1);
    if (!client) return Response.json({ account: { points: 0, stamps: 0, referrals: 0 }, history: [] }, { headers: { "Cache-Control": "no-store" } });
    const [account, history] = await Promise.all([
      db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.clientId, client.id)).limit(1),
      db.select({ id: loyaltyTransactions.id, kind: loyaltyTransactions.kind, pointsDelta: loyaltyTransactions.pointsDelta, stampsDelta: loyaltyTransactions.stampsDelta, referralsDelta: loyaltyTransactions.referralsDelta, description: loyaltyTransactions.description, createdAt: loyaltyTransactions.createdAt }).from(loyaltyTransactions).where(eq(loyaltyTransactions.clientId, client.id)).orderBy(desc(loyaltyTransactions.createdAt)).limit(30),
    ]);
    return Response.json({ account: account[0] ?? { points: 0, stamps: 0, referrals: 0 }, history }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível carregar sua fidelidade." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
