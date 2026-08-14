import { describe } from "vitest";

import { GetPetQuotaUseCase } from "../../../src/use-cases/pet/get-pet-quota.use-case.ts";
import { test } from "../db-fixture.ts";
import { createUserSession, type TestDb } from "../helpers.ts";

async function addPets(
  db: TestDb,
  ownerId: string,
  count: number,
  data: { deceasedAt?: Date } = {},
) {
  for (let index = 0; index < count; index += 1) {
    await db.pet.create({
      data: { name: `Pet ${index}`, species: "DOG", ownerId, ...data },
    });
  }
}

describe.concurrent("GetPetQuotaUseCase", () => {
  test("defaults to FREE when the user has no subscription row", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const useCase = new GetPetQuotaUseCase({ db });

    // Most accounts never get a Subscription row; absence must mean FREE
    // rather than crashing or granting unlimited.
    expect(await useCase.execute({ actorId: user.id })).toEqual({
      tier: "FREE",
      used: 0,
      limit: 3,
      remaining: 3,
    });
  });

  test("counts pets against the free allowance", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await addPets(db, user.id, 2);

    const useCase = new GetPetQuotaUseCase({ db });
    expect(await useCase.execute({ actorId: user.id })).toMatchObject({ used: 2, remaining: 1 });
  });

  test("floors remaining at zero rather than going negative", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    // Possible for real: a plan downgrade leaves more pets than the new limit.
    await addPets(db, user.id, 5);

    const useCase = new GetPetQuotaUseCase({ db });
    expect(await useCase.execute({ actorId: user.id })).toMatchObject({
      used: 5,
      limit: 3,
      remaining: 0,
    });
  });

  test("reports premium as unlimited with nulls, not Infinity", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await db.subscription.create({ data: { userId: user.id, tier: "PREMIUM" } });
    await addPets(db, user.id, 4);

    const useCase = new GetPetQuotaUseCase({ db });
    // Infinity does not survive JSON, so the contract is an explicit null.
    expect(await useCase.execute({ actorId: user.id })).toEqual({
      tier: "PREMIUM",
      used: 4,
      limit: null,
      remaining: null,
    });
  });

  test("excludes deceased pets from the count", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await addPets(db, user.id, 2);
    await addPets(db, user.id, 1, { deceasedAt: new Date() });

    const useCase = new GetPetQuotaUseCase({ db });
    expect(await useCase.execute({ actorId: user.id })).toMatchObject({ used: 2, remaining: 1 });
  });

  test("counts only the actor's own pets", async ({ db, expect }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);
    await addPets(db, bob.user.id, 3);

    const useCase = new GetPetQuotaUseCase({ db });
    expect(await useCase.execute({ actorId: alice.user.id })).toMatchObject({
      used: 0,
      remaining: 3,
    });
  });
});
