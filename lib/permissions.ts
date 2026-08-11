import type { AuthUser } from "./auth";

export const internalRoles = ["admin", "manager", "staff"] as const;
export type InternalRole = (typeof internalRoles)[number];

export const permissionKeys = [
  "dashboard",
  "appointments",
  "schedule",
  "services",
  "clients",
  "portfolio",
  "finance",
  "marketing",
  "communication",
  "reviews",
  "settings",
  "users",
] as const;
export type Permission = (typeof permissionKeys)[number];

const rolePermissions: Record<InternalRole, readonly Permission[]> = {
  admin: permissionKeys,
  manager: permissionKeys.filter((permission) => permission !== "users"),
  staff: ["dashboard", "appointments", "clients"],
};

export function isInternalRole(role: string): role is InternalRole {
  return internalRoles.includes(role as InternalRole);
}

export function permissionsForRole(role: string): readonly Permission[] {
  return isInternalRole(role) ? rolePermissions[role] : [];
}

export function hasPermission(user: AuthUser | null, permission: Permission) {
  return Boolean(user && permissionsForRole(user.role).includes(permission));
}
