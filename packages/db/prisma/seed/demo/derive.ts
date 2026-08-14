import type { SeedContext } from "../context.ts";

/**
 * The columns that are copies of something else.
 *
 * Three values in this schema are denormalised on purpose — an organization's
 * rating, a user's point total, and a conversation's last-message timestamp —
 * and each one is maintained by the use case that writes the underlying row.
 * The seed writes those rows directly, so it has to close the loop itself.
 *
 * Doing it here rather than inline in each generator is deliberate: the
 * generators run in one order and the aggregates depend on rows several of them
 * wrote, so any inline attempt would be reading a total that was not finished
 * yet. Recomputing at the end, from what actually landed, cannot be wrong.
 */

/** LEVELS in packages/api/src/schemas/gamification.ts. Duplicated because db must not import api. */
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export function levelForPoints(points: number): number {
  let level = 1;
  LEVEL_THRESHOLDS.forEach((minimum, index) => {
    if (points >= minimum) level = index + 1;
  });
  return level;
}

export async function deriveAggregates(ctx: SeedContext): Promise<void> {
  const { db } = ctx;

  // --- Organization.ratingAvg / ratingCount ---------------------------------

  const ratings = await db.review.groupBy({
    by: ["orgId"],
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const rating of ratings) {
    await db.organization.update({
      where: { id: rating.orgId },
      data: {
        // Rounded to two places: the column is a float and an unrounded average
        // renders as 4.7999999999999998 in any component that does not format it.
        ratingAvg: Number((rating._avg.rating ?? 0).toFixed(2)),
        ratingCount: rating._count._all,
      },
    });
  }

  // --- GamificationProfile.points / level -----------------------------------

  const totals = await db.pointsLedgerEntry.groupBy({
    by: ["userId"],
    _sum: { points: true },
  });

  for (const total of totals) {
    const points = total._sum.points ?? 0;

    await db.gamificationProfile.updateMany({
      where: { userId: total.userId },
      data: { points, level: levelForPoints(points) },
    });
  }

  // --- Conversation.lastMessageAt -------------------------------------------
  //
  // Set at insert time from the script that produced the thread, but one thread
  // gets an extra image message appended afterwards, and the ordering on
  // /mensagens is `lastMessageAt desc` — a thread whose newest message is not
  // reflected here sorts into the wrong place and reads as stale.

  const latest = await db.message.groupBy({
    by: ["conversationId"],
    _max: { createdAt: true },
  });

  for (const entry of latest) {
    if (!entry._max.createdAt) continue;

    await db.conversation.update({
      where: { id: entry.conversationId },
      data: { lastMessageAt: entry._max.createdAt },
    });
  }
}
