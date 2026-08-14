import { z } from "zod";

/**
 * "Pontos Aumigos" — the levels and badges from app/hooks/useGamification.tsx.
 *
 * The prototype kept the whole thing in `localStorage` and exposed
 * `addPoints(n, reason)` to the client, so points were free: clearing storage
 * reset your level, and any component could mint them. The table below is the
 * only part that is still shared with the client — it is presentation data, and
 * both sides need it to render a progress bar. Awarding is server-only.
 */

export interface Level {
  level: number;
  name: string;
  icon: string;
  minPoints: number;
}

export const LEVELS: readonly Level[] = [
  { level: 1, name: "Iniciante", icon: "🐾", minPoints: 0 },
  { level: 2, name: "Amigo dos Pets", icon: "🐕", minPoints: 100 },
  { level: 3, name: "Cuidador", icon: "💖", minPoints: 300 },
  { level: 4, name: "Protetor Animal", icon: "🛡️", minPoints: 600 },
  { level: 5, name: "Herói Animal", icon: "🌟", minPoints: 1000 },
];

/**
 * What each action is worth, quoted verbatim from the prototype's "Como ganhar
 * pontos" card so the promise on screen and the award in the database are the
 * same number.
 */
export const POINTS = {
  ADOPTION_APPLICATION: 100,
  REVIEW_CREATED: 20,
  FAVORITE_ADDED: 10,
  ALERT_SIGHTING: 50,
} as const;

/** The badge codes seeded in packages/db/prisma/seed.ts. */
export const BADGE_CODES = {
  FIRST_ADOPTION: "first_adoption",
  REVIEWER: "reviewer",
  FAVORITE_COLLECTOR: "favorite_collector",
  ALERT_HERO: "alert_hero",
} as const;

/** How many of a thing earns the corresponding badge. */
export const BADGE_THRESHOLDS = {
  [BADGE_CODES.REVIEWER]: 5,
  [BADGE_CODES.FAVORITE_COLLECTOR]: 10,
  [BADGE_CODES.ALERT_HERO]: 3,
} as const;

/**
 * The level a point total falls in.
 *
 * The prototype derived this with
 * `LEVELS.findIndex(l => l.minPoints > points) - 1`, which returns level 1 for
 * a total past the last threshold — 1000 points scored as "Iniciante". This
 * walks the table instead.
 */
export function levelForPoints(points: number): Level {
  let current = LEVELS[0]!;

  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
  }

  return current;
}

export function nextLevelAfter(level: number): Level | null {
  return LEVELS.find((candidate) => candidate.level === level + 1) ?? null;
}

/** 0–100 progress towards the next level; 100 at the top of the table. */
export function progressToNextLevel(points: number): number {
  const current = levelForPoints(points);
  const next = nextLevelAfter(current.level);

  if (!next) return 100;

  const span = next.minPoints - current.minPoints;
  const gained = points - current.minPoints;

  return Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
}

export const listLedgerSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

export type ListLedgerInput = z.infer<typeof listLedgerSchema>;
