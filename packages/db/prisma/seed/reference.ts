import { hashPassword } from "better-auth/crypto";

import type { PrismaClient } from "../../src/index.ts";

/**
 * The rows production needs regardless of who is using it.
 *
 * This layer is the difference between the seed and the cleanup: everything
 * else the seed writes is demonstration data that gets truncated away, but
 * badges are application content — `/perfil` renders the full catalogue with
 * the unearned ones greyed out, so an empty `badge` table is a broken screen
 * for a real user, not an empty one.
 *
 * Written by both scripts, always idempotently.
 */

const BADGES = [
  {
    code: "first_adoption",
    name: "Primeira Adoção",
    icon: "🏆",
    description: "Adotou seu primeiro pet",
  },
  {
    code: "reviewer",
    name: "Avaliador",
    icon: "⭐",
    description: "Avaliou 5 prestadores",
  },
  {
    code: "favorite_collector",
    name: "Colecionador",
    icon: "💚",
    description: "Favoritou 10 pets",
  },
  {
    code: "alert_hero",
    name: "Herói do Alert",
    icon: "🚨",
    description: "Ajudou 3 pets perdidos",
  },
];

export const BADGE_COUNT = BADGES.length;
export const BADGE_CODES = BADGES.map((badge) => badge.code);

/** Matches Better Auth's own `emailAndPassword.minPasswordLength`. */
const MIN_PASSWORD_LENGTH = 8;

export interface ReferenceResult {
  badges: number;
  admin: { email: string; created: boolean } | null;
}

export async function seedReference(db: PrismaClient): Promise<ReferenceResult> {
  for (const badge of BADGES) {
    await db.badge.upsert({ where: { code: badge.code }, update: badge, create: badge });
  }

  return { badges: BADGES.length, admin: await upsertAdmin(db) };
}

/**
 * The one account that survives a cleanup.
 *
 * Deliberately env-driven and deliberately skipped when unset. A default
 * password here would be the single worst thing in the repository: it would be
 * committed, published, and attached to the only ADMIN account on a live
 * database. Better to hand over a system with no administrator than one with a
 * public one.
 */
async function upsertAdmin(db: PrismaClient): Promise<{ email: string; created: boolean } | null> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administração Animalesko";

  if (!email && !password) {
    console.warn(
      "  ! ADMIN_EMAIL / ADMIN_PASSWORD not set — no administrator account created.\n" +
        "    Re-run with both set to create one.",
    );
    return null;
  }

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set together, or neither.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  const user = await db.user.upsert({
    where: { email },
    update: { name, roles: ["ADMIN", "TUTOR"] },
    create: { email, name, emailVerified: true, roles: ["ADMIN", "TUTOR"] },
    select: { id: true },
  });

  // Hashed with Better Auth's own scrypt parameters, so the account works
  // through the normal sign-in form rather than only through the seed.
  const passwordHash = await hashPassword(password);

  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    update: { password: passwordHash },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  // Better Auth's `databaseHook` creates this on sign-up, but it only fires
  // through the auth API — a direct write has to do it itself or `/perfil`
  // throws on a missing profile.
  await db.gamificationProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return { email, created: existing === null };
}
