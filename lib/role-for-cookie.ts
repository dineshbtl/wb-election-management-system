/**
 * Normalizes Strapi role (name / type) to the cookie value expected by middleware.ts
 * ("superadmin", "district coordinator", "booth coordinator", etc.).
 */
export function roleForCookie(
  roleObj: { name?: string | null; type?: string | null } | null,
): string {
  if (!roleObj) return "";
  const name =
    roleObj.name != null ? String(roleObj.name).trim().toLowerCase() : "";
  const typeRaw =
    roleObj.type != null ? String(roleObj.type).trim().toLowerCase() : "";
  const fromType = typeRaw.replace(/_/g, " ");
  let role = name || fromType;
  if (
    role === "super admin" ||
    typeRaw === "superadmin" ||
    typeRaw === "super_admin"
  ) {
    role = "superadmin";
  }
  return role;
}
