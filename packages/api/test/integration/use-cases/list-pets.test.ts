import { describe } from "vitest";

import { ListPetsUseCase } from "../../../src/use-cases/pet/list-pets.use-case.ts";
import { test } from "../db-fixture.ts";
import { createUserSession, type TestDb } from "../helpers.ts";

/** Sequential creates so createdAt ordering is deterministic. */
async function seedPets(db: TestDb, ownerId: string, names: string[]) {
  for (const name of names) {
    await db.pet.create({ data: { name, species: "DOG", ownerId } });
  }
}

describe.concurrent("ListPetsUseCase", () => {
  test("returns only the actor's pets, newest first", async ({ db, expect }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);

    await seedPets(db, alice.user.id, ["Primeiro", "Segundo"]);
    await seedPets(db, bob.user.id, ["Do Bob"]);

    const result = await new ListPetsUseCase({ db }).execute({
      actorId: alice.user.id,
      includeDeceased: false,
      limit: 50,
    });

    expect(result.items.map((pet) => pet.name)).toEqual(["Segundo", "Primeiro"]);
    expect(result.nextCursor).toBeNull();
  });

  test("hides deceased pets unless asked for them", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await seedPets(db, user.id, ["Vivo"]);
    await db.pet.create({
      data: { name: "Falecido", species: "CAT", ownerId: user.id, deceasedAt: new Date() },
    });

    const useCase = new ListPetsUseCase({ db });

    const visible = await useCase.execute({
      actorId: user.id,
      includeDeceased: false,
      limit: 50,
    });
    expect(visible.items.map((pet) => pet.name)).toEqual(["Vivo"]);

    const all = await useCase.execute({ actorId: user.id, includeDeceased: true, limit: 50 });
    expect(all.items).toHaveLength(2);
  });

  test("walks every page exactly once via the cursor", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await seedPets(db, user.id, ["A", "B", "C", "D", "E"]);

    const useCase = new ListPetsUseCase({ db });
    const seen: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await useCase.execute({
        actorId: user.id,
        includeDeceased: false,
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...page.items.map((pet) => pet.name));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    // No duplicates and no gaps across the page boundaries.
    expect(seen).toEqual(["E", "D", "C", "B", "A"]);
    expect(new Set(seen).size).toBe(5);
  });

  test("reports no next cursor when the result exactly fills a page", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await seedPets(db, user.id, ["A", "B"]);

    // The off-by-one worth guarding: `take: limit + 1` must not invent a page.
    const page = await new ListPetsUseCase({ db }).execute({
      actorId: user.id,
      includeDeceased: false,
      limit: 2,
    });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });
});
