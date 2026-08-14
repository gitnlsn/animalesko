import { levelForPoints } from "../../schemas/gamification.ts";

import type { Database } from "@animalesko/db";

/**
 * The slice needed to award points. Narrow enough that a Prisma interactive
 * transaction client satisfies it, which is what lets a caller award points and
 * write its own row atomically.
 */
export type AwardPointsDb = Pick<Database, "gamificationProfile" | "pointsLedgerEntry">;

export interface AwardPointsInput {
  userId: string;
  points: number;
  /** Shown to the user, e.g. "Favoritou um pet! 💚". */
  reason: string;
  /**
   * Stable key for *this* award, e.g. `favorite:clx123`.
   *
   * Also the idempotency key: passing `once` refuses to award twice for the
   * same source. Without it, un-favoriting and re-favoriting the same pet farms
   * 10 points per click — the prototype's client-side `addPoints` had exactly
   * this hole.
   */
  source: string;
  once?: boolean;
}

export interface AwardPointsResult {
  awarded: number;
  totalPoints: number;
  level: number;
  leveledUp: boolean;
}

/**
 * Appends to the points ledger and re-derives the profile total.
 *
 * The ledger is the record of truth; `GamificationProfile.points` is a running
 * total kept for cheap reads. It is recomputed by `increment` rather than
 * re-summing the ledger, so this stays a single round trip — the two can only
 * diverge if a ledger row is deleted, which nothing does.
 */
export async function awardPoints(
  db: AwardPointsDb,
  input: AwardPointsInput,
): Promise<AwardPointsResult> {
  const profileBefore = await db.gamificationProfile.upsert({
    where: { userId: input.userId },
    update: {},
    create: { userId: input.userId },
    select: { points: true, level: true },
  });

  if (input.once) {
    const existing = await db.pointsLedgerEntry.findFirst({
      where: { userId: input.userId, source: input.source },
      select: { id: true },
    });

    if (existing) {
      return {
        awarded: 0,
        totalPoints: profileBefore.points,
        level: profileBefore.level,
        leveledUp: false,
      };
    }
  }

  await db.pointsLedgerEntry.create({
    data: {
      userId: input.userId,
      points: input.points,
      reason: input.reason,
      source: input.source,
    },
  });

  const totalPoints = profileBefore.points + input.points;
  const level = levelForPoints(totalPoints).level;

  await db.gamificationProfile.update({
    where: { userId: input.userId },
    data: { points: { increment: input.points }, level },
  });

  return {
    awarded: input.points,
    totalPoints,
    level,
    leveledUp: level > profileBefore.level,
  };
}
