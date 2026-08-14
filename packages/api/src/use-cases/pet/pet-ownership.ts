import type { Database } from "@animalesko/db";

import { NotFoundError } from "../errors.ts";
import { petSelect, toPetDTO, type PetDTO } from "./pet-select.ts";

export type PetOwnershipDb = Pick<Database, "pet">;

/**
 * Loads a pet the actor owns, or throws.
 *
 * The ownership filter is part of the *query*, not a check performed after
 * fetching. That distinction matters: a pet belonging to somebody else produces
 * exactly the same NotFoundError as an id that was never issued, so the error
 * cannot be used to enumerate which pets exist.
 */
export async function loadOwnedPet(
  db: PetOwnershipDb,
  params: { petId: string; ownerId: string },
): Promise<PetDTO> {
  const pet = await db.pet.findFirst({
    where: { id: params.petId, ownerId: params.ownerId },
    select: petSelect,
  });

  if (!pet) {
    throw new NotFoundError("Pet não encontrado.");
  }

  return toPetDTO(pet);
}
