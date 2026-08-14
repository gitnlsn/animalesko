import { loadOwnedPet, type PetOwnershipDb } from "./pet-ownership.ts";

import type { ActorCommand, UseCase } from "../types.ts";

export interface DeletePetDeps {
  db: PetOwnershipDb;
}

export interface DeletePetCommand extends ActorCommand {
  petId: string;
}

export interface DeletePetResult {
  id: string;
}

export class DeletePetUseCase implements UseCase<DeletePetCommand, DeletePetResult> {
  constructor(private readonly deps: DeletePetDeps) {}

  async execute({ actorId, petId }: DeletePetCommand): Promise<DeletePetResult> {
    await loadOwnedPet(this.deps.db, { petId, ownerId: actorId });

    // Health records, vaccinations and reminders cascade from the schema.
    await this.deps.db.pet.delete({ where: { id: petId } });

    return { id: petId };
  }
}
