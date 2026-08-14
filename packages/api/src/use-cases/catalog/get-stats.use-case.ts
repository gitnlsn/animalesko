import type { Database } from "@animalesko/db";

import type { UseCase } from "../types.ts";

export interface GetCatalogStatsDeps {
  db: Pick<Database, "adoptionListing" | "booking" | "serviceOffering">;
}

export interface CatalogStats {
  adoptedThisMonth: number;
  availableListings: number;
  bookingsThisMonth: number;
  activeOfferings: number;
}

/**
 * The home screen's two stat cards.
 *
 * The prototype hardcoded "1.2k pets adotados" and "350+ agendamentos" with a
 * "+12%" trend beside them. These are the real counts; the trend arrow is gone
 * rather than faked, since nothing here records a previous period yet.
 */
export class GetCatalogStatsUseCase implements UseCase<void, CatalogStats> {
  constructor(private readonly deps: GetCatalogStatsDeps) {}

  async execute(_command?: void, now = new Date()): Promise<CatalogStats> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [adoptedThisMonth, availableListings, bookingsThisMonth, activeOfferings] =
      await Promise.all([
        this.deps.db.adoptionListing.count({
          where: { status: "ADOPTED", adoptedAt: { gte: monthStart } },
        }),
        this.deps.db.adoptionListing.count({ where: { status: "AVAILABLE" } }),
        this.deps.db.booking.count({ where: { createdAt: { gte: monthStart } } }),
        this.deps.db.serviceOffering.count({ where: { isActive: true } }),
      ]);

    return { adoptedThisMonth, availableListings, bookingsThisMonth, activeOfferings };
  }
}
