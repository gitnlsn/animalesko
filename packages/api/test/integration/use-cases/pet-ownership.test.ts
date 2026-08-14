import { describe } from "vitest";

import { NotFoundError } from "../../../src/use-cases/errors.ts";
import { DeletePetUseCase } from "../../../src/use-cases/pet/delete-pet.use-case.ts";
import { GetPetUseCase } from "../../../src/use-cases/pet/get-pet.use-case.ts";
import { UpdatePetUseCase } from "../../../src/use-cases/pet/update-pet.use-case.ts";
import { test } from "../db-fixture.ts";
import { createUserSession, type TestDb } from "../helpers.ts";

/**
 * Get, update and delete share one rule — you may only touch your own pet — so
 * they are proven together rather than in three near-identical files.
 */
function useCases(db: TestDb) {
  return {
    get: new GetPetUseCase({ db }),
    update: new UpdatePetUseCase({ db }),
    remove: new DeletePetUseCase({ db }),
  };
}

describe.concurrent("pet ownership", () => {
  test("lets the owner read, update and delete their pet", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { get, update, remove } = useCases(db);
    const pet = await db.pet.create({
      data: { name: "Luna", species: "DOG", ownerId: user.id },
    });

    expect(await get.execute({ actorId: user.id, petId: pet.id })).toMatchObject({
      name: "Luna",
    });

    const updated = await update.execute({
      actorId: user.id,
      petId: pet.id,
      data: { name: "Luna Maria", healthStatus: "EXCELLENT" },
    });
    expect(updated).toMatchObject({ name: "Luna Maria", healthStatus: "EXCELLENT" });

    await expect(remove.execute({ actorId: user.id, petId: pet.id })).resolves.toEqual({
      id: pet.id,
    });
    expect(await db.pet.findUnique({ where: { id: pet.id } })).toBeNull();
  });

  test("reports another user's pet as not found, and leaves it untouched", async ({
    db,
    expect,
  }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);
    const { get, update, remove } = useCases(db);

    const pet = await db.pet.create({
      data: { name: "Da Alice", species: "CAT", ownerId: alice.user.id },
    });

    // NOT_FOUND rather than FORBIDDEN on purpose: a distinguishable error would
    // confirm to an attacker that the id exists.
    await expect(get.execute({ actorId: bob.user.id, petId: pet.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    await expect(
      update.execute({ actorId: bob.user.id, petId: pet.id, data: { name: "Sequestrada" } }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(remove.execute({ actorId: bob.user.id, petId: pet.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const stored = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(stored.name).toBe("Da Alice");
    expect(stored.ownerId).toBe(alice.user.id);
  });

  test("reports an id that never existed the same way", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { get } = useCases(db);

    await expect(
      get.execute({ actorId: user.id, petId: "cmaaaaaaaaaaaaaaaaaaaaaaa" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("leaves fields the caller did not mention untouched", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { update } = useCases(db);
    const pet = await db.pet.create({
      data: {
        name: "Mimi",
        species: "CAT",
        ownerId: user.id,
        sex: "FEMALE",
        healthStatus: "EXCELLENT",
        temperament: ["Tranquila", "Silenciosa"],
        neutered: true,
        notes: "Prefere ambientes silenciosos.",
      },
    });

    // Regression guard: `.partial()` leaves `.default()` active, so an update
    // schema built from a defaulted object silently reset healthStatus to GOOD
    // and emptied temperament on a rename. Renaming must change only the name.
    const updated = await update.execute({
      actorId: user.id,
      petId: pet.id,
      data: { name: "Mimi Clara" },
    });

    expect(updated).toMatchObject({
      name: "Mimi Clara",
      sex: "FEMALE",
      healthStatus: "EXCELLENT",
      temperament: ["Tranquila", "Silenciosa"],
      neutered: true,
      notes: "Prefere ambientes silenciosos.",
    });
  });

  test("cannot be used to reassign a pet to another owner", async ({ db, expect }) => {
    const alice = await createUserSession(db);
    const bob = await createUserSession(db);
    const { update } = useCases(db);
    const pet = await db.pet.create({
      data: { name: "Thor", species: "DOG", ownerId: alice.user.id },
    });

    // ownerId is not part of the update contract, so even a crafted payload
    // cannot move the pet — it is dropped before reaching Prisma.
    await update.execute({
      actorId: alice.user.id,
      petId: pet.id,
      data: { name: "Thor", ownerId: bob.user.id } as never,
    });

    const stored = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(stored.ownerId).toBe(alice.user.id);
  });
});
