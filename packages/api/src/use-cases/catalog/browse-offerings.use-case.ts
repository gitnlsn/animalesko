import { publicOfferingSelect, type PublicOfferingDTO } from "./catalog-select.ts";

import type { Database } from "@animalesko/db";

import type { BrowseOfferingsInput } from "../../schemas/catalog.ts";
import type { UseCase } from "../types.ts";

export interface BrowseOfferingsDeps {
  db: Pick<Database, "serviceOffering">;
}

/** No actor: the browse surface must render for anonymous visitors. */
export class BrowseOfferingsUseCase implements UseCase<BrowseOfferingsInput, PublicOfferingDTO[]> {
  constructor(private readonly deps: BrowseOfferingsDeps) {}

  execute({ type, city, limit }: BrowseOfferingsInput): Promise<PublicOfferingDTO[]> {
    return this.deps.db.serviceOffering.findMany({
      where: {
        // Deactivating an offering in `plus` withdraws it from `app`.
        isActive: true,
        ...(type ? { type } : {}),
        ...(city ? { org: { city } } : {}),
      },
      select: publicOfferingSelect,
      orderBy: [{ org: { ratingAvg: "desc" } }, { createdAt: "desc" }],
      take: limit,
    });
  }
}
