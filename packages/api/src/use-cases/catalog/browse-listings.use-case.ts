import { publicListingSelect, type PublicListingDTO } from "./catalog-select.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { BrowseListingsInput } from "../../schemas/catalog.ts";
import type { UseCase } from "../types.ts";

export interface BrowseListingsDeps {
  db: Pick<Database, "adoptionListing">;
}

export class BrowseListingsUseCase implements UseCase<BrowseListingsInput, PublicListingDTO[]> {
  constructor(private readonly deps: BrowseListingsDeps) {}

  execute({
    species,
    size,
    sex,
    state,
    q,
    limit,
  }: BrowseListingsInput): Promise<PublicListingDTO[]> {
    return this.deps.db.adoptionListing.findMany({
      where: {
        // Drafts, reserved and adopted animals never reach the public feed.
        status: "AVAILABLE",
        ...(state ? { state } : {}),
        ...(q ? { OR: textSearch(q) } : {}),
        pet: {
          ...(species ? { species } : {}),
          ...(size ? { size } : {}),
          ...(sex ? { sex } : {}),
        },
      },
      select: publicListingSelect,
      // URGENT sorts before PUPPY before READY by enum declaration order.
      orderBy: [{ urgency: "asc" }, { publishedAt: "desc" }],
      take: limit,
    });
  }
}

/**
 * The prototype's search box filtered a two-element mock array in the browser.
 * This is a case-insensitive `contains` across the fields a visitor would
 * plausibly type — name, breed and the summary line. Deliberately not a
 * Postgres full-text index: at this corpus size it would cost more to maintain
 * than it saves, and `ILIKE` keeps partial words ("gold") matching.
 */
function textSearch(q: string): Prisma.AdoptionListingWhereInput[] {
  const contains = { contains: q, mode: "insensitive" } as const;

  return [{ summary: contains }, { pet: { name: contains } }, { pet: { breed: contains } }];
}
