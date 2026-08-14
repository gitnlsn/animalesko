import type { Database } from "@animalesko/db";

export type AwardBadgeDb = Pick<Database, "badge" | "userBadge">;

/**
 * Grants a badge by code, at most once per user.
 *
 * Idempotent through the `@@unique([userId, badgeId])` constraint rather than a
 * read-then-write, so two concurrent qualifying actions cannot both insert.
 * Silently does nothing when the code is not seeded — a badge that does not
 * exist yet must not fail the action that would have earned it.
 */
export async function awardBadge(
  db: AwardBadgeDb,
  input: { userId: string; code: string },
): Promise<boolean> {
  const badge = await db.badge.findUnique({
    where: { code: input.code },
    select: { id: true },
  });

  if (!badge) return false;

  const result = await db.userBadge.createMany({
    data: [{ userId: input.userId, badgeId: badge.id }],
    skipDuplicates: true,
  });

  return result.count > 0;
}
