import type { Database, OrganizationMemberRole } from "@animalesko/db";

/**
 * The organization membership carried on every session. `plus` reads this to
 * decide what the caller may administer; `app` reads it to know whether to
 * offer the "switch to Animalesko Plus" entry point.
 */
export interface SessionOrganization {
  id: string;
  slug: string;
  name: string;
  role: OrganizationMemberRole;
}

export async function organizationsForUser(
  db: Database,
  userId: string,
): Promise<SessionOrganization[]> {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: {
      role: true,
      org: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map(({ role, org }) => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    role,
  }));
}

/** Roles that may create, edit or delete an organization's resources. */
const WRITE_ROLES: OrganizationMemberRole[] = ["OWNER", "ADMIN", "STAFF"];

/** Roles that may change the organization itself, its staff or its billing. */
const ADMIN_ROLES: OrganizationMemberRole[] = ["OWNER", "ADMIN"];

export function canWriteOrganization(role: OrganizationMemberRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function canAdministerOrganization(role: OrganizationMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function findMembership(
  organizations: SessionOrganization[],
  orgId: string,
): SessionOrganization | undefined {
  return organizations.find((organization) => organization.id === orgId);
}
