import { TRPCError } from "@trpc/server";
import { describe } from "vitest";

import { test, uniqueMicrochip } from "./db-fixture.ts";
import { appCaller, createUserSession } from "./helpers.ts";

describe.concurrent("pet router", () => {
  test("creates a pet owned by the caller and reads it back", async ({ db, expect }) => {
    const { user, session } = await createUserSession(db);
    const caller = appCaller(db, session);

    const created = await caller.pet.create({
      name: "Rex",
      species: "DOG",
      breed: "Golden Retriever",
      sex: "MALE",
      size: "LARGE",
      birthDate: new Date("2021-03-15"),
      weightKg: 25,
      healthStatus: "GOOD",
      notes: "Alérgico a frango.",
      temperament: ["Ativo"],
      neutered: false,
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Rex");
    // A plain number, not a Prisma Decimal: the class crosses neither superjson
    // nor the Server/Client Component boundary.
    expect(created.weightKg).toBe(25);
    expect(typeof created.weightKg).toBe("number");

    const persisted = await db.pet.findUniqueOrThrow({ where: { id: created.id } });
    expect(persisted.ownerId).toBe(user.id);

    const fetched = await caller.pet.byId({ id: created.id });
    expect(fetched.name).toBe("Rex");
  });

  test("rejects anonymous callers", async ({ db, expect }) => {
    const caller = appCaller(db, null);

    await expect(caller.pet.list({ includeDeceased: false, limit: 50 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("never returns another user's pets", async ({ db, expect }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);

    const alicePet = await appCaller(db, alice.session).pet.create({
      name: "Luna",
      species: "DOG",
      sex: "FEMALE",
      healthStatus: "GOOD",
      temperament: [],
      neutered: false,
    });

    const bobList = await appCaller(db, bob.session).pet.list({
      includeDeceased: false,
      limit: 50,
    });
    expect(bobList.items).toHaveLength(0);

    // Reading a foreign pet by id is NOT_FOUND, not FORBIDDEN — an attacker
    // must not be able to tell which ids exist.
    await expect(appCaller(db, bob.session).pet.byId({ id: alicePet.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await expect(
      appCaller(db, bob.session).pet.update({ id: alicePet.id, name: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(appCaller(db, bob.session).pet.delete({ id: alicePet.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // And the row is untouched.
    const untouched = await db.pet.findUniqueOrThrow({ where: { id: alicePet.id } });
    expect(untouched.name).toBe("Luna");
  });

  test("enforces the free-plan pet limit", async ({ db, expect }) => {
    const { session } = await createUserSession(db);
    const caller = appCaller(db, session);

    for (let index = 0; index < 3; index += 1) {
      await caller.pet.create({
        name: `Pet ${index}`,
        species: "CAT",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
      });
    }

    const quota = await caller.pet.quota();
    expect(quota).toMatchObject({ tier: "FREE", used: 3, limit: 3, remaining: 0 });

    await expect(
      caller.pet.create({
        name: "One too many",
        species: "CAT",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("lifts the limit for premium subscribers", async ({ db, expect }) => {
    const { user, session } = await createUserSession(db);
    await db.subscription.create({ data: { userId: user.id, tier: "PREMIUM" } });

    const caller = appCaller(db, session);

    for (let index = 0; index < 5; index += 1) {
      await caller.pet.create({
        name: `Pet ${index}`,
        species: "DOG",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
      });
    }

    const quota = await caller.pet.quota();
    expect(quota).toMatchObject({ tier: "PREMIUM", used: 5, limit: null, remaining: null });
  });

  test("rejects a duplicate microchip with a readable message", async ({ db, expect }) => {
    const { session } = await createUserSession(db);
    const caller = appCaller(db, session);

    const base = {
      species: "DOG" as const,
      sex: "UNKNOWN" as const,
      healthStatus: "GOOD" as const,
      temperament: [],
      neutered: false,
      microchip: uniqueMicrochip(),
    };

    await caller.pet.create({ ...base, name: "First" });

    await expect(caller.pet.create({ ...base, name: "Second" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("validates input before touching the database", async ({ db, expect }) => {
    const { user, session } = await createUserSession(db);
    const caller = appCaller(db, session);

    await expect(
      caller.pet.create({
        name: "   ",
        species: "DOG",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      caller.pet.create({
        name: "Futuro",
        species: "DOG",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
        birthDate: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Scoped to this actor. A global count would assume an empty database,
    // which a concurrently running suite may no longer take for granted.
    expect(await db.pet.count({ where: { ownerId: user.id } })).toBe(0);
  });

  test("hides deceased pets unless asked for", async ({ db, expect }) => {
    const { user, session } = await createUserSession(db);
    const caller = appCaller(db, session);

    await caller.pet.create({
      name: "Alive",
      species: "DOG",
      sex: "UNKNOWN",
      healthStatus: "GOOD",
      temperament: [],
      neutered: false,
    });

    await db.pet.create({
      data: { name: "Gone", species: "DOG", ownerId: user.id, deceasedAt: new Date() },
    });

    const visible = await caller.pet.list({ includeDeceased: false, limit: 50 });
    expect(visible.items.map((pet) => pet.name)).toEqual(["Alive"]);

    const all = await caller.pet.list({ includeDeceased: true, limit: 50 });
    expect(all.items).toHaveLength(2);
  });

  test("paginates with a stable cursor", async ({ db, expect }) => {
    const { user, session } = await createUserSession(db);
    await db.subscription.create({ data: { userId: user.id, tier: "PREMIUM" } });

    const caller = appCaller(db, session);
    for (let index = 0; index < 5; index += 1) {
      await caller.pet.create({
        name: `Pet ${index}`,
        species: "DOG",
        sex: "UNKNOWN",
        healthStatus: "GOOD",
        temperament: [],
        neutered: false,
      });
    }

    const first = await caller.pet.list({ includeDeceased: false, limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();

    const second = await caller.pet.list({
      includeDeceased: false,
      limit: 2,
      cursor: first.nextCursor!,
    });
    expect(second.items).toHaveLength(2);

    const ids = new Set([...first.items, ...second.items].map((pet) => pet.id));
    expect(ids.size).toBe(4);

    const last = await caller.pet.list({
      includeDeceased: false,
      limit: 2,
      cursor: second.nextCursor!,
    });
    expect(last.items).toHaveLength(1);
    expect(last.nextCursor).toBeNull();
  });

  test("deletes only the caller's pet", async ({ db, expect }) => {
    const { session } = await createUserSession(db);
    const caller = appCaller(db, session);

    const pet = await caller.pet.create({
      name: "Temporary",
      species: "CAT",
      sex: "UNKNOWN",
      healthStatus: "GOOD",
      temperament: [],
      neutered: false,
    });

    await caller.pet.delete({ id: pet.id });

    expect(await db.pet.findUnique({ where: { id: pet.id } })).toBeNull();
  });
});
