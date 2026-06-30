export type UserRole = "Admin" | "User" | "Guest";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ["view_metrics", "run_backup", "manage_users", "access_ai", "write_data", "read_data"],
  User: ["access_ai", "write_data", "read_data"],
  Guest: ["read_data"]
};

/**
 * Returns true if a role has the required action clearance.
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
