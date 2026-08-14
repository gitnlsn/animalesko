import type { Database } from "@animalesko/db";

import { petSelect, toPetDTO, type PetDTO } from "./pet-select.ts";

import type { ListPetsInput } from "../../schemas/pet.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface ListPetsDeps {
  db: Pick<Database, "pet">;
}

export type ListPetsCommand = ActorCommand & ListPetsInput;

export interface ListPetsResult {
  items: PetDTO[];
  nextCursor: string | null;
}

export class ListPetsUseCase implements UseCase<ListPetsCommand, ListPetsResult> {
  constructor(private readonly deps: ListPetsDeps) {}

  async execute({
    actorId,
    includeDeceased,
    limit,
    cursor,
  }: ListPetsCommand): Promise<ListPetsResult> {
    const pets = await this.deps.db.pet.findMany({
      where: {
        ownerId: actorId,
        ...(includeDeceased ? {} : { deceasedAt: null }),
      },
      select: petSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // One extra row reveals whether another page exists without a second
      // COUNT query.
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = pets.length > limit;
    const items = hasMore ? pets.slice(0, limit) : pets;

    return {
      items: items.map(toPetDTO),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }
}
