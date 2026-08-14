import { loadOwnedPet, type PetOwnershipDb } from "./pet-ownership.ts";

import type { PetDTO } from "./pet-select.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface GetPetDeps {
  db: PetOwnershipDb;
}

export interface GetPetCommand extends ActorCommand {
  petId: string;
}

export class GetPetUseCase implements UseCase<GetPetCommand, PetDTO> {
  constructor(private readonly deps: GetPetDeps) {}

  execute({ actorId, petId }: GetPetCommand): Promise<PetDTO> {
    return loadOwnedPet(this.deps.db, { petId, ownerId: actorId });
  }
}
