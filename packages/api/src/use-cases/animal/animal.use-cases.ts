import {
  createAnimalSchema,
  updateAnimalSchema,
  type AnimalRelation,
  type CreateAnimalInput,
  type ListAnimalsInput,
  type UpdateAnimalInput,
} from "../../schemas/animal.ts";
import { ConflictError, NotFoundError } from "../errors.ts";
import { petSelect, toPetDTO, type PetDTO } from "../pet/pet-select.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface AnimalDeps {
  db: Pick<Database, "pet" | "appointment" | "adoptionListing">;
}

/** The projection, plus how this organization is connected to the animal. */
export type AnimalDTO = PetDTO & {
  relation: AnimalRelation;
  /** Set when the animal is in custody and already published for adoption. */
  listing: { id: string; status: string } | null;
};

const animalSelect = {
  ...petSelect,
  custodianOrgId: true,
  ownerId: true,
  adoptionListing: { select: { id: true, status: true } },
} satisfies Prisma.PetSelect;

type AnimalRow = Prisma.PetGetPayload<{ select: typeof animalSelect }>;

function toAnimalDTO(row: AnimalRow, organizationId: string): AnimalDTO {
  // `custodianOrgId` and `ownerId` are read to derive the relation and then
  // dropped: which org holds an animal is not something to ship to a client
  // that already knows it is asking about its own.
  const { custodianOrgId, ownerId: _ownerId, adoptionListing, ...pet } = row;

  return {
    ...toPetDTO(pet),
    relation: custodianOrgId === organizationId ? "CUSTODY" : "PATIENT",
    listing: adoptionListing,
  };
}

/** Animals in custody here, plus any this organization has an appointment for. */
function scopeToOrg(organizationId: string): Prisma.PetWhereInput {
  return {
    OR: [{ custodianOrgId: organizationId }, { appointments: { some: { orgId: organizationId } } }],
  };
}

export type ListAnimalsCommand = OrganizationCommand & ListAnimalsInput;

export class ListAnimalsUseCase implements UseCase<ListAnimalsCommand, AnimalDTO[]> {
  constructor(private readonly deps: AnimalDeps) {}

  async execute({
    organizationId,
    relation,
    species,
    q,
    limit,
  }: ListAnimalsCommand): Promise<AnimalDTO[]> {
    const contains = { contains: q, mode: "insensitive" } as const;

    const rows = await this.deps.db.pet.findMany({
      where: {
        // Narrowing to one relation replaces the union rather than filtering
        // after it, so "só pacientes" is still one indexed query.
        ...(relation === "CUSTODY"
          ? { custodianOrgId: organizationId }
          : relation === "PATIENT"
            ? {
                custodianOrgId: { not: organizationId },
                appointments: { some: { orgId: organizationId } },
              }
            : scopeToOrg(organizationId)),
        ...(species ? { species } : {}),
        ...(q ? { OR: [{ name: contains }, { breed: contains }] } : {}),
        deceasedAt: null,
      },
      select: animalSelect,
      orderBy: { name: "asc" },
      take: limit,
    });

    return rows.map((row) => toAnimalDTO(row, organizationId));
  }
}

export interface GetAnimalCommand extends OrganizationCommand {
  petId: string;
}

export class GetAnimalUseCase implements UseCase<GetAnimalCommand, AnimalDTO> {
  constructor(private readonly deps: AnimalDeps) {}

  async execute({ organizationId, petId }: GetAnimalCommand): Promise<AnimalDTO> {
    const row = await this.deps.db.pet.findFirst({
      where: { id: petId, ...scopeToOrg(organizationId) },
      select: animalSelect,
    });

    if (!row) {
      throw new NotFoundError("Animal não encontrado.");
    }

    return toAnimalDTO(row, organizationId);
  }
}

export interface CreateAnimalCommand extends OrganizationCommand {
  data: CreateAnimalInput;
}

/** Takes an animal into the organization's custody. */
export class CreateAnimalUseCase implements UseCase<CreateAnimalCommand, AnimalDTO> {
  constructor(private readonly deps: AnimalDeps) {}

  async execute(command: CreateAnimalCommand): Promise<AnimalDTO> {
    const { organizationId } = command;
    const data = parseCommandData(createAnimalSchema, command.data);

    try {
      const row = await this.deps.db.pet.create({
        data: {
          ...data,
          weightKg: data.weightKg ?? null,
          custodianOrgId: organizationId,
          // No owner: a shelter animal belongs to nobody until it is adopted.
          ownerId: null,
        },
        select: animalSelect,
      });

      return toAnimalDTO(row, organizationId);
    } catch (error) {
      if (isUniqueViolationOn(error, "microchip")) {
        throw new ConflictError("Este microchip já está cadastrado em outro animal.", {
          cause: error,
        });
      }
      throw error;
    }
  }
}

export type UpdateAnimalCommand = OrganizationCommand & UpdateAnimalInput;

/**
 * Editing an animal's record.
 *
 * Restricted to animals **in custody**. A clinic can attach clinical records to
 * a patient it attends, but it must not be able to rename someone else's dog or
 * change its microchip — the tutor owns that row.
 */
export class UpdateAnimalUseCase implements UseCase<UpdateAnimalCommand, AnimalDTO> {
  constructor(private readonly deps: AnimalDeps) {}

  async execute(command: UpdateAnimalCommand): Promise<AnimalDTO> {
    const { organizationId } = command;
    const { id, ...data } = parseCommandData(updateAnimalSchema, {
      ...command,
      organizationId: undefined,
    });

    const existing = await this.deps.db.pet.findFirst({
      where: { id, custodianOrgId: organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Animal não encontrado sob a guarda desta organização.");
    }

    try {
      const row = await this.deps.db.pet.update({
        where: { id: existing.id },
        data,
        select: animalSelect,
      });

      return toAnimalDTO(row, organizationId);
    } catch (error) {
      if (isUniqueViolationOn(error, "microchip")) {
        throw new ConflictError("Este microchip já está cadastrado em outro animal.", {
          cause: error,
        });
      }
      throw error;
    }
  }
}

/**
 * Asserts the organization may attach a clinical record to this animal.
 *
 * Custody *or* an appointment — a vet who has seen the animal can record what
 * they found, which is the whole point of `HealthRecord.orgId`.
 */
export async function assertAnimalInScope(
  db: Pick<Database, "pet">,
  params: { petId: string; organizationId: string },
): Promise<void> {
  const pet = await db.pet.findFirst({
    where: { id: params.petId, ...scopeToOrg(params.organizationId) },
    select: { id: true },
  });

  if (!pet) {
    throw new NotFoundError("Animal não encontrado.");
  }
}
