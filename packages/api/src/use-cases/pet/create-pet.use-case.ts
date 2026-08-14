import { createPetSchema } from "../../schemas/pet.ts";
import { ConflictError, ForbiddenError } from "../errors.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";
import { PET_LIMIT_BY_TIER, resolvePetQuota, type PetPlanDb } from "./pet-plan.ts";
import { petSelect, toPetDTO, type PetDTO } from "./pet-select.ts";

import type { CreatePetInput } from "../../schemas/pet.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface CreatePetDeps {
  db: PetPlanDb;
}

export interface CreatePetCommand extends ActorCommand {
  data: CreatePetInput;
}

export class CreatePetUseCase implements UseCase<CreatePetCommand, PetDTO> {
  constructor(private readonly deps: CreatePetDeps) {}

  async execute(command: CreatePetCommand): Promise<PetDTO> {
    const { actorId } = command;
    // Strips anything the contract does not offer, so the spread below cannot
    // carry an unexpected column into Prisma.
    const data = parseCommandData(createPetSchema, command.data);

    const quota = await resolvePetQuota(this.deps.db, actorId);

    // `remaining` is null on an unlimited plan, which is why this tests for 0
    // explicitly rather than falsiness.
    if (quota.remaining === 0) {
      const limit = PET_LIMIT_BY_TIER[quota.tier];
      throw new ForbiddenError(
        `Seu plano permite até ${limit} pets. Faça upgrade para cadastrar mais.`,
      );
    }

    try {
      const pet = await this.deps.db.pet.create({
        data: {
          ...data,
          weightKg: data.weightKg ?? null,
          ownerId: actorId,
        },
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
