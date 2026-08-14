import {
  LEVELS,
  levelForPoints,
  nextLevelAfter,
  progressToNextLevel,
  type Level,
} from "../../schemas/gamification.ts";

import type { Database } from "@animalesko/db";

import type { ListLedgerInput } from "../../schemas/gamification.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface GetGamificationProfileDeps {
  db: Pick<Database, "gamificationProfile" | "badge" | "pointsLedgerEntry">;
}

export interface EarnedBadge {
  code: string;
  name: string;
  description: string;
  icon: string;
  awardedAt: Date | null;
}

export interface LedgerEntry {
  id: string;
  points: number;
  reason: string;
  createdAt: Date;
}

export interface GamificationProfileResult {
  points: number;
  level: Level;
  nextLevel: Level | null;
  /** 0–100. */
  progress: number;
  /** Every seeded badge, earned or not, so the UI can show what is left. */
  badges: (EarnedBadge & { earned: boolean })[];
  recent: LedgerEntry[];
  allLevels: readonly Level[];
}

export type GetGamificationProfileCommand = ActorCommand & ListLedgerInput;

/**
 * Everything the profile screen's gamification card needs, in one read.
 *
 * The level is *derived* from the point total here rather than trusted from
 * `GamificationProfile.level`: the stored column exists so other queries can
 * filter on it cheaply, but the ledger sum is authoritative, and a mismatch
 * should render as the truth rather than the cache.
 */
export class GetGamificationProfileUseCase implements UseCase<
  GetGamificationProfileCommand,
  GamificationProfileResult
> {
  constructor(private readonly deps: GetGamificationProfileDeps) {}

  async execute({ actorId, limit }: GetGamificationProfileCommand) {
    const [profile, allBadges, earned, recent] = await Promise.all([
      this.deps.db.gamificationProfile.findUnique({
        where: { userId: actorId },
        select: { points: true },
      }),
      this.deps.db.badge.findMany({
        select: { code: true, name: true, description: true, icon: true },
        orderBy: { code: "asc" },
      }),
      this.deps.db.badge.findMany({
        where: { awards: { some: { userId: actorId } } },
        select: { code: true, awards: { where: { userId: actorId }, select: { awardedAt: true } } },
      }),
      this.deps.db.pointsLedgerEntry.findMany({
        where: { userId: actorId },
        select: { id: true, points: true, reason: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const awardedAtByCode = new Map(
      earned.map((badge) => [badge.code, (badge.awards[0]?.awardedAt ?? null) as Date | null]),
    );

    const points = profile?.points ?? 0;
    const level = levelForPoints(points);

    return {
      points,
      level,
      nextLevel: nextLevelAfter(level.level),
      progress: progressToNextLevel(points),
      badges: allBadges.map((badge) => ({
        ...badge,
        earned: awardedAtByCode.has(badge.code),
        awardedAt: awardedAtByCode.get(badge.code) ?? null,
      })),
      recent,
      allLevels: LEVELS,
    };
  }
}
