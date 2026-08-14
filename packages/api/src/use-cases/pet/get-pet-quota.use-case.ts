import { resolvePetQuota, type PetPlanDb, type PetQuota } from "./pet-plan.ts";

import type { ActorCommand, UseCase } from "../types.ts";

export interface GetPetQuotaDeps {
  db: PetPlanDb;
}

/** Powers the plan card in apps/app — the same numbers create() enforces. */
export class GetPetQuotaUseCase implements UseCase<ActorCommand, PetQuota> {
  constructor(private readonly deps: GetPetQuotaDeps) {}

  execute({ actorId }: ActorCommand): Promise<PetQuota> {
    return resolvePetQuota(this.deps.db, actorId);
  }
}
