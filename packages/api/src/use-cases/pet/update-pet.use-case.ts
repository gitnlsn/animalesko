import { updatePetDataSchema } from "../../schemas/pet.ts";
import { ConflictError } from "../errors.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";
import { loadOwnedPet, type PetOwnershipDb } from "./pet-ownership.ts";
import { petSelect, toPetDTO, type PetDTO } from "./pet-select.ts";

import type { UpdatePetData } from "../../schemas/pet.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface UpdatePetDeps {
  db: PetOwnershipDb;
}

export interface UpdatePetCommand extends ActorCommand {
  petId: string;
  data: UpdatePetData;
}

export class UpdatePetUseCase implements UseCase<UpdatePetCommand, PetDTO> {
  constructor(private readonly deps: UpdatePetDeps) {}

  async execute(command: UpdatePetCommand): Promise<PetDTO> {
    const { actorId, petId } = command;

    // A genuinely partial parse: fields the caller omitted stay omitted rather
    // than being reset to a default, and unknown keys (ownerId, deceasedAt) are
    // dropped instead of reaching the write.
    const data = parseCommandData(updatePetDataSchema, command.data);

    // Establishes ownership before the write; a foreign id throws NotFound here
    // rather than updating somebody else's row.
    await loadOwnedPet(this.deps.db, { petId, ownerId: actorId });

    try {
      const pet = await this.deps.db.pet.update({
        where: { id: petId },
        data,
        select: petSelect,
      });

      return toPetDTO(pet);
    } catch (error) {
      if (isUniqueViolationOn(error, "microchip")) {
        throw new ConflictError("Este microchip já está cadastrado em outro pet.", {
          cause: error,
        });
      }
      throw error;
    }
  }
}
