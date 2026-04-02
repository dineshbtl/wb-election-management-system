/**
 * Normalize Strapi /users/me response (v4 flat, v4 attributes, v5 { data }, nested role).
 */

export type MeRoleRef = { name?: string | null; type?: string | null } | null;

function unwrapRoleEntity(roleRaw: unknown): Record<string, unknown> | null {
  if (roleRaw == null) return null;
  if (typeof roleRaw === "number" || typeof roleRaw === "string") {
    return null;
  }

  let r = roleRaw as Record<string, unknown>;

  if (r.data !== undefined) {
    const d = r.data;
    if (Array.isArray(d)) {
      const first = d[0];
      if (first && typeof first === "object") {
        r = first as Record<string, unknown>;
      } else {
        return null;
      }
    } else if (d && typeof d === "object") {
      r = d as Record<string, unknown>;
    } else {
      return null;
    }
  }

  if (r == null || typeof r !== "object") return null;

  if (r.attributes && typeof r.attributes === "object") {
    r = {
      id: r.id,
      documentId: r.documentId,
      ...(r.attributes as Record<string, unknown>),
    };
  }

  return r;
}

export function normalizeUsersMeResponse(resData: unknown): {
  user: Record<string, unknown> | null;
  role: MeRoleRef;
} {
  if (resData == null || typeof resData !== "object") {
    return { user: null, role: null };
  }

  let root = resData as Record<string, unknown>;

  if (root.user && typeof root.user === "object") {
    root = root.user as Record<string, unknown>;
  }

  if (
    root.data &&
    typeof root.data === "object" &&
    !Array.isArray(root.data) &&
    root.username == null &&
    root.email == null
  ) {
    root = root.data as Record<string, unknown>;
  }

  if (root.attributes && typeof root.attributes === "object") {
    root = {
      id: root.id,
      documentId: root.documentId,
      ...(root.attributes as Record<string, unknown>),
    };
  }

  const roleEntity = unwrapRoleEntity(root.role);
  const role: MeRoleRef = roleEntity
    ? {
        name: (roleEntity.name as string | null | undefined) ?? null,
        type: (roleEntity.type as string | null | undefined) ?? null,
      }
    : null;

  const user = {
    ...(root as Record<string, unknown>),
    ...(roleEntity ? { role: roleEntity } : {}),
  };

  return { user, role };
}
