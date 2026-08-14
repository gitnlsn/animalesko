import { describe } from "vitest";

import { GetGamificationProfileUseCase } from "../../../src/use-cases/gamification/get-gamification-profile.use-case.ts";
import { awardBadge } from "../../../src/use-cases/gamification/award-badge.ts";
import { awardPoints } from "../../../src/use-cases/gamification/award-points.ts";
import { test } from "../db-fixture.ts";
import { createUserSession, type TestDb } from "../helpers.ts";

/**
 * Badges are seeded globally by `pnpm db:seed`, but this fixture rolls back and
 * the test database is never seeded, so each test inserts the codes it needs.
 */
async function seedBadge(db: TestDb, code: string) {
  return db.badge.upsert({
    where: { code },
    update: {},
    create: { code, name: code, description: code, icon: "🏅" },
  });
}

describe.concurrent("awardPoints", () => {
  test("appends to the ledger and re-derives the level", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    const first = await awardPoints(db, {
      userId: user.id,
      points: 60,
      reason: "Teste",
      source: "test:1",
    });

    expect(first.totalPoints).toBe(60);
    expect(first.level).toBe(1);
    expect(first.leveledUp).toBe(false);

    const second = await awardPoints(db, {
      userId: user.id,
      points: 60,
      reason: "Teste",
      source: "test:2",
    });

    // 120 points crosses the level-2 threshold at 100.
    expect(second.totalPoints).toBe(120);
    expect(second.level).toBe(2);
    expect(second.leveledUp).toBe(true);
  });

  test("keeps the profile total equal to the ledger sum", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    for (let index = 0; index < 4; index += 1) {
      await awardPoints(db, {
        userId: user.id,
        points: 25,
        reason: "Teste",
        source: `test:${index}`,
      });
    }

    const [profile, sum] = await Promise.all([
      db.gamificationProfile.findUniqueOrThrow({ where: { userId: user.id } }),
      db.pointsLedgerEntry.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
    ]);

    expect(profile.points).toBe(100);
    expect(profile.points).toBe(sum._sum.points);
  });

  test("`once` refuses a second award for the same source", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    await awardPoints(db, {
      userId: user.id,
      points: 10,
      reason: "Teste",
      source: "favorite_listing:abc",
      once: true,
    });

    const repeat = await awardPoints(db, {
      userId: user.id,
      points: 10,
      reason: "Teste",
      source: "favorite_listing:abc",
      once: true,
    });

    expect(repeat.awarded).toBe(0);
    expect(repeat.totalPoints).toBe(10);

    const entries = await db.pointsLedgerEntry.count({ where: { userId: user.id } });
    expect(entries).toBe(1);
  });

  test("creates the profile for a user who has none", async ({ db, expect }) => {
    const user = await db.user.create({
      data: { email: `${crypto.randomUUID()}@example.com`, name: "Sem perfil" },
    });

    const result = await awardPoints(db, {
      userId: user.id,
      points: 10,
      reason: "Teste",
      source: "test:new",
    });

    expect(result.totalPoints).toBe(10);
  });
});

describe.concurrent("awardBadge", () => {
  test("grants once and ignores repeats", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await seedBadge(db, "reviewer");

    expect(await awardBadge(db, { userId: user.id, code: "reviewer" })).toBe(true);
    expect(await awardBadge(db, { userId: user.id, code: "reviewer" })).toBe(false);

    const held = await db.userBadge.count({ where: { userId: user.id } });
    expect(held).toBe(1);
  });

  test("is a no-op for a code that is not seeded", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    // Must not throw: a badge that does not exist yet cannot be allowed to fail
    // the action that would have earned it.
    expect(await awardBadge(db, { userId: user.id, code: "nao_existe" })).toBe(false);
  });
});

describe.concurrent("GetGamificationProfileUseCase", () => {
  test("reports the derived level, progress and badge roster", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await seedBadge(db, "reviewer");
    await seedBadge(db, "alert_hero");

    await awardPoints(db, {
      userId: user.id,
      points: 200,
      reason: "Teste",
      source: "test:points",
    });
    await awardBadge(db, { userId: user.id, code: "reviewer" });

    const result = await new GetGamificationProfileUseCase({ db }).execute({
      actorId: user.id,
      limit: 10,
    });

    expect(result.points).toBe(200);
    expect(result.level.level).toBe(2);
    expect(result.nextLevel?.level).toBe(3);
    // 200 of the way from 100 to 300 is halfway.
    expect(result.progress).toBe(50);

    const reviewer = result.badges.find((badge) => badge.code === "reviewer");
    const hero = result.badges.find((badge) => badge.code === "alert_hero");
    expect(reviewer?.earned).toBe(true);
    expect(hero?.earned).toBe(false);

    expect(result.recent).toHaveLength(1);
  });

  test("returns a level-1 profile for a user who has earned nothing", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    const result = await new GetGamificationProfileUseCase({ db }).execute({
      actorId: user.id,
      limit: 10,
    });

    expect(result.points).toBe(0);
    expect(result.level.level).toBe(1);
    expect(result.recent).toEqual([]);
  });
});
