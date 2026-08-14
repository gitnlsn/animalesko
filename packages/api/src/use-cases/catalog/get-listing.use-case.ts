import {
  listingDetailSelect,
  publicListingSelect,
  toListingDetailDTO,
  type ListingDetailDTO,
  type PublicListingDTO,
} from "./catalog-select.ts";
import { NotFoundError } from "../errors.ts";

import type { Database } from "@animalesko/db";

import type { ListingIdInput } from "../../schemas/catalog.ts";
import type { UseCase } from "../types.ts";

export interface GetListingDeps {
  db: Pick<Database, "adoptionListing">;
}

export interface GetListingResult {
  listing: ListingDetailDTO;
  /** "Outros pets do abrigo" — the prototype's mock sibling list, made real. */
  siblings: PublicListingDTO[];
}

/**
 * One listing plus its shelter's other available animals.
 *
 * Public, like the rest of `catalog`: a shared adoption link has to open for
 * someone who has never signed in, which is exactly what the prototype's
 * share button produced and could not deliver.
 */
export class GetListingUseCase implements UseCase<ListingIdInput, GetListingResult> {
  constructor(private readonly deps: GetListingDeps) {}

  async execute({ id }: ListingIdInput): Promise<GetListingResult> {
    const row = await this.deps.db.adoptionListing.findFirst({
      // A draft or archived listing is not addressable, even by direct link.
      where: { id, status: { in: ["AVAILABLE", "RESERVED", "ADOPTED"] } },
      select: listingDetailSelect,
    });

    if (!row) {
      throw new NotFoundError("Pet não encontrado.");
    }

    const siblings = await this.deps.db.adoptionListing.findMany({
      where: { orgId: row.org.id, status: "AVAILABLE", id: { not: row.id } },
      select: publicListingSelect,
      orderBy: [{ urgency: "asc" }, { publishedAt: "desc" }],
      take: 4,
    });

    return { listing: toListingDetailDTO(row), siblings };
  }
}
