import { publicListingSelect, type PublicListingDTO } from "./catalog-select.ts";

import type { Database } from "@animalesko/db";

import type { UseCase } from "../types.ts";

export interface PetOfTheDayDeps {
  db: Pick<Database, "adoptionListing">;
}

/**
 * Days since the epoch, in UTC.
 *
 * Deliberately not local time: the server and the client would otherwise
 * disagree across a timezone boundary and hydrate two different pets.
 */
function dayIndex(now: Date): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/**
 * The one listing featured today.
 *
 * The prototype rolled `Math.random()` in an effect and cached the result in
 * `localStorage`, so "Pet do Dia" was per-device, re-rolled whenever storage
 * was cleared, and could never be linked to. This picks by day index over a
 * stable ordering instead: everyone sees the same animal, it changes at
 * midnight UTC, and nothing is stored.
 */
export class PetOfTheDayUseCase implements UseCase<void, PublicListingDTO | null> {
  constructor(private readonly deps: PetOfTheDayDeps) {}

  async execute(_command?: void, now = new Date()): Promise<PublicListingDTO | null> {
    const where = { status: "AVAILABLE" } as const;

    const total = await this.deps.db.adoptionListing.count({ where });
    if (total === 0) return null;

    const [listing] = await this.deps.db.adoptionListing.findMany({
      where,
      select: publicListingSelect,
      // `id` alone is a stable total ordering; anything involving a timestamp
      // would shuffle the window as new listings arrive mid-day.
      orderBy: { id: "asc" },
      skip: dayIndex(now) % total,
      take: 1,
    });

    return listing ?? null;
  }
}
