import { getCurrentUser } from "./auth";
import { hasPermission, type Permission } from "./permissions";

export async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  const resource = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const permissionByResource: Partial<Record<string, Permission>> = {
    appointments: "appointments",
    clients: "clients",
    communications: "communication",
    finance: "finance",
    marketing: "marketing",
    portfolio: "portfolio",
    reviews: "reviews",
    schedule: "schedule",
    services: "services",
    settings: "settings",
    waitlist: "settings",
  };
  const permission = permissionByResource[resource];
  return permission ? (hasPermission(user, permission) ? user : null) : (user?.role === "admin" ? user : null);
}

export async function requirePermission(request: Request, permission: Permission) {
  const user = await getCurrentUser(request);
  return hasPermission(user, permission) ? user : null;
}
