import { getCurrentUser } from "./auth";

export async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  return user?.role === "admin" ? user : null;
}
