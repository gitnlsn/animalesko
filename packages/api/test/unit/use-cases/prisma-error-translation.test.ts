import { Prisma } from "@animalesko/db";
import { describe, expect, it } from "vitest";

import { ConflictError } from "../../../src/use-cases/errors.ts";
import { CreatePetUseCase } from "../../../src/use-cases/pet/create-pet.use-case.ts";
import {
  isUniqueViolationOn,
  uniqueConstraintFields,
} from "../../../src/use-cases/prisma-errors.ts";

import type { CreatePetInput } from "../../../src/schemas/pet.ts";

/**
 * The one case that cannot be produced against the real schema.
 *
 * `Pet` has exactly one unique column (`microchip`), so a P2002 naming a
 * *different* field can never occur naturally — yet the translation must not
 * swallow it as a microchip conflict, because doing so would report an
 * unrelated database failure as a user-fixable one. Everything else about these
 * use cases is covered by integration tests against the Docker database.
 */
function knownRequestError(meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.9.1",
    meta,
  });
}

/** Prisma 7 driver adapters report the constraint here. */
const adapterMeta = (fields: string[]) => ({
  modelName: "Pet",
  driverAdapterError: { name: "DriverAdapterError", cause: { constraint: { fields } } },
});

describe("unique-constraint translation", () => {
  it("reads fields from the driver-adapter shape", () => {
    expect(uniqueConstraintFields(knownRequestError(adapterMeta(["microchip"])))).toEqual([
      "microchip",
    ]);
  });

  it("still reads the classic meta.target shape, array or string", () => {
    expect(uniqueConstraintFields(knownRequestError({ target: ["microchip"] }))).toEqual([
      "microchip",
    ]);
    expect(uniqueConstraintFields(knownRequestError({ target: "pet_microchip_key" }))).toEqual([
      "pet_microchip_key",
    ]);
  });

  it("returns nothing rather than throwing when metadata is absent", () => {
    expect(uniqueConstraintFields(knownRequestError({}))).toEqual([]);
  });

  it("matches only the field it was asked about", () => {
    const other = knownRequestError(adapterMeta(["email"]));

    expect(isUniqueViolationOn(other, "microchip")).toBe(false);
    expect(isUniqueViolationOn(knownRequestError(adapterMeta(["microchip"])), "microchip")).toBe(
      true,
    );
  });

  it("ignores Prisma errors that are not unique violations", () => {
    const notFound = new Prisma.PrismaClientKnownRequestError("No record", {
      code: "P2025",
      clientVersion: "7.9.1",
    });

    expect(isUniqueViolationOn(notFound, "microchip")).toBe(false);
    expect(isUniqueViolationOn(new Error("boom"), "microchip")).toBe(false);
  });
});

describe("CreatePetUseCase error handling", () => {
  const petData: CreatePetInput = {
    name: "Rex",
    species: "DOG",
    sex: "UNKNOWN",
    healthStatus: "GOOD",
    temperament: [],
    neutered: false,
  };

  /** Minimal fake — the narrow deps mean only these three methods exist. */
  function fakeDb(onCreate: () => never) {
    return {
      subscription: { findUnique: async () => null },
      pet: { count: async () => 0, create: onCreate },
    } as unknown as ConstructorParameters<typeof CreatePetUseCase>[0]["db"];
  }

  it("converts a microchip violation into ConflictError", async () => {
    const useCase = new CreatePetUseCase({
      db: fakeDb(() => {
        throw knownRequestError(adapterMeta(["microchip"]));
      }),
    });

    await expect(useCase.execute({ actorId: "user-1", data: petData })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("re-throws a unique violation on any other column untouched", async () => {
    const original = knownRequestError(adapterMeta(["some_other_column"]));
    const useCase = new CreatePetUseCase({
      db: fakeDb(() => {
        throw original;
      }),
    });

    // Must surface as the original database error, not as a friendly conflict
    // the user could act on.
    const thrown = await useCase.execute({ actorId: "user-1", data: petData }).catch((e) => e);

    expect(thrown).toBe(original);
    expect(thrown).not.toBeInstanceOf(ConflictError);
  });
});
