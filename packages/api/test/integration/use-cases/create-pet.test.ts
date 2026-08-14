import { describe } from "vitest";

import { ConflictError, ForbiddenError } from "../../../src/use-cases/errors.ts";
import { CreatePetUseCase } from "../../../src/use-cases/pet/create-pet.use-case.ts";
import { test, uniqueMicrochip } from "../db-fixture.ts";
import { createUserSession } from "../helpers.ts";

import type { CreatePetInput } from "../../../src/schemas/pet.ts";

/**
 * Runs against the real animalesko_test database, but with no tRPC in sight —
 * the use case is constructed directly with the transaction the test was given.
 * Nothing here is ever committed, so these tests run concurrently with every
 * other file without a truncation anywhere.
 */
function petData(overrides: Partial<CreatePetInput> = {}): CreatePetInput {
  return {
    name: "Rex",
    species: "DOG",
    sex: "UNKNOWN",
    healthStatus: "GOOD",
    temperament: [],
    neutered: false,
    ...overrides,
  } as CreatePetInput;
}

describe.concurrent("CreatePetUseCase", () => {
  test("persists the pet against the actor and returns the projection", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const useCase = new CreatePetUseCase({ db });

    const pet = await useCase.execute({
      actorId: user.id,
      data: petData({
        breed: "Golden Retriever",
        sex: "MALE",
        size: "LARGE",
        birthDate: new Date("2021-03-15"),
        weightKg: 25,
        notes: "Alérgico a frango.",
      }),
    });

    expect(pet.name).toBe("Rex");
    expect(pet.weightKg).toBe(25);
    expect(typeof pet.weightKg).toBe("number");

    const stored = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(stored.ownerId).toBe(user.id);

    // The projection is a contract: it must not leak columns beyond petSelect.
    expect(pet).not.toHaveProperty("ownerId");
    expect(pet).not.toHaveProperty("custodianOrgId");
  });

  test("rejects the pet that would exceed the free plan", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const useCase = new CreatePetUseCase({ db });

    for (let index = 0; index < 3; index += 1) {
      await useCase.execute({ actorId: user.id, data: petData({ name: `Pet ${index}` }) });
    }

    await expect(
      useCase.execute({ actorId: user.id, data: petData({ name: "One too many" }) }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // The failed attempt must not have been written.
    expect(await db.pet.count({ where: { ownerId: user.id } })).toBe(3);
  });

  test("does not limit premium subscribers", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    await db.subscription.create({ data: { userId: user.id, tier: "PREMIUM" } });
    const useCase = new CreatePetUseCase({ db });

    for (let index = 0; index < 5; index += 1) {
      await useCase.execute({ actorId: user.id, data: petData({ name: `Pet ${index}` }) });
    }

    expect(await db.pet.count({ where: { ownerId: user.id } })).toBe(5);
  });

  test("frees a slot when a pet is marked deceased", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const useCase = new CreatePetUseCase({ db });

    const first = await useCase.execute({ actorId: user.id, data: petData({ name: "A" }) });
    await useCase.execute({ actorId: user.id, data: petData({ name: "B" }) });
    await useCase.execute({ actorId: user.id, data: petData({ name: "C" }) });

    await db.pet.update({ where: { id: first.id }, data: { deceasedAt: new Date() } });

    // Deceased pets keep their records but stop consuming a slot.
    await expect(
      useCase.execute({ actorId: user.id, data: petData({ name: "D" }) }),
    ).resolves.toMatchObject({ name: "D" });
  });

  test("translates the real unique index on microchip into a ConflictError", async ({
    db,
    expect,
  }) => {
    const { user } = await createUserSession(db);
    const useCase = new CreatePetUseCase({ db });
    const microchip = uniqueMicrochip();

    await useCase.execute({ actorId: user.id, data: petData({ name: "First", microchip }) });

    // Raised by Postgres, not by a stub — which is exactly why this belongs in
    // an integration test rather than against a fake.
    await expect(
      useCase.execute({ actorId: user.id, data: petData({ name: "Second", microchip }) }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("scopes the microchip conflict across owners, not just within one", async ({
    db,
    expect,
  }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);
    const useCase = new CreatePetUseCase({ db });
    const microchip = uniqueMicrochip();

    await useCase.execute({ actorId: alice.user.id, data: petData({ microchip }) });

    await expect(
      useCase.execute({ actorId: bob.user.id, data: petData({ microchip }) }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
