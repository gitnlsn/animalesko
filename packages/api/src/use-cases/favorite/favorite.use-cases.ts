import { BADGE_CODES, BADGE_THRESHOLDS, POINTS } from "../../schemas/gamification.ts";
import {
  publicListingSelect,
  publicOfferingSelect,
  type PublicListingDTO,
  type PublicOfferingDTO,
} from "../catalog/catalog-select.ts";
import { NotFoundError } from "../errors.ts";
import { awardBadge } from "../gamification/award-badge.ts";
import { awardPoints } from "../gamification/award-points.ts";

import type { Database } from "@animalesko/db";

import type {
  FavoriteListingInput,
  FavoriteOfferingInput,
  FavoriteToggleResult,
} from "../../schemas/favorite.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface FavoriteDeps {
  db: Pick<
    Database,
    | "favoriteListing"
    | "favoriteOffering"
    | "adoptionListing"
    | "serviceOffering"
    | "gamificationProfile"
    | "pointsLedgerEntry"
    | "badge"
    | "userBadge"
  >;
}

export class ListFavoriteListingsUseCase implements UseCase<ActorCommand, PublicListingDTO[]> {
  constructor(private readonly deps: FavoriteDeps) {}

  async execute({ actorId }: ActorCommand): Promise<PublicListingDTO[]> {
    const rows = await this.deps.db.favoriteListing.findMany({
      where: { userId: actorId },
      select: { listing: { select: publicListingSelect } },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => row.listing);
  }
}

export class ListFavoriteOfferingsUseCase implements UseCase<ActorCommand, PublicOfferingDTO[]> {
  constructor(private readonly deps: FavoriteDeps) {}

  async execute({ actorId }: ActorCommand): Promise<PublicOfferingDTO[]> {
    const rows = await this.deps.db.favoriteOffering.findMany({
      where: { userId: actorId },
      select: { offering: { select: publicOfferingSelect } },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => row.offering);
  }
}

export type ToggleFavoriteListingCommand = ActorCommand & FavoriteListingInput;

/**
 * Favouriting an adoption listing.
 *
 * Points are awarded `once` per listing, keyed on the listing id: without that,
 * clicking the heart on and off farms 10 points a click. The prototype's
 * client-side `addPoints` had precisely that hole.
 */
export class ToggleFavoriteListingUseCase implements UseCase<
  ToggleFavoriteListingCommand,
  FavoriteToggleResult
> {
  constructor(private readonly deps: FavoriteDeps) {}

  async execute({ actorId, listingId }: ToggleFavoriteListingCommand) {
    const existing = await this.deps.db.favoriteListing.findUnique({
      where: { userId_listingId: { userId: actorId, listingId } },
      select: { id: true },
    });

    if (existing) {
      await this.deps.db.favoriteListing.delete({ where: { id: existing.id } });
      return { favorited: false, pointsAwarded: 0 };
    }

    // Confirms the listing exists before inserting, so a bad id reads as "not
    // found" rather than surfacing a foreign-key violation.
    const listing = await this.deps.db.adoptionListing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new NotFoundError("Pet não encontrado.");
    }

    await this.deps.db.favoriteListing.create({ data: { userId: actorId, listingId } });

    const award = await awardPoints(this.deps.db, {
      userId: actorId,
      points: POINTS.FAVORITE_ADDED,
      reason: "Favoritou um pet! 💚",
      source: `favorite_listing:${listingId}`,
      once: true,
    });

    await this.maybeAwardCollectorBadge(actorId);

    return { favorited: true, pointsAwarded: award.awarded };
  }

  /** "Colecionador" — 10 favourites, counting pets and services together. */
  private async maybeAwardCollectorBadge(userId: string): Promise<void> {
    const [listings, offerings] = await Promise.all([
      this.deps.db.favoriteListing.count({ where: { userId } }),
      this.deps.db.favoriteOffering.count({ where: { userId } }),
    ]);

    if (listings + offerings >= BADGE_THRESHOLDS[BADGE_CODES.FAVORITE_COLLECTOR]) {
      await awardBadge(this.deps.db, { userId, code: BADGE_CODES.FAVORITE_COLLECTOR });
    }
  }
}

export type ToggleFavoriteOfferingCommand = ActorCommand & FavoriteOfferingInput;

export class ToggleFavoriteOfferingUseCase implements UseCase<
  ToggleFavoriteOfferingCommand,
  FavoriteToggleResult
> {
  constructor(private readonly deps: FavoriteDeps) {}

  async execute({ actorId, offeringId }: ToggleFavoriteOfferingCommand) {
    const existing = await this.deps.db.favoriteOffering.findUnique({
      where: { userId_offeringId: { userId: actorId, offeringId } },
      select: { id: true },
    });

    if (existing) {
      await this.deps.db.favoriteOffering.delete({ where: { id: existing.id } });
      return { favorited: false, pointsAwarded: 0 };
    }

    const offering = await this.deps.db.serviceOffering.findUnique({
      where: { id: offeringId },
      select: { id: true },
    });

    if (!offering) {
      throw new NotFoundError("Serviço não encontrado.");
    }

    await this.deps.db.favoriteOffering.create({ data: { userId: actorId, offeringId } });

    return { favorited: true, pointsAwarded: 0 };
  }
}

/**
 * Which of a set of ids the caller has favourited.
 *
 * One query for a whole grid, rather than a `favorited` boolean on each card's
 * own request. Returns ids so the client can hold them in a Set.
 */
export interface FavoriteIdsResult {
  listingIds: string[];
  offeringIds: string[];
}

export class ListFavoriteIdsUseCase implements UseCase<ActorCommand, FavoriteIdsResult> {
  constructor(private readonly deps: FavoriteDeps) {}

  async execute({ actorId }: ActorCommand): Promise<FavoriteIdsResult> {
    const [listings, offerings] = await Promise.all([
      this.deps.db.favoriteListing.findMany({
        where: { userId: actorId },
        select: { listingId: true },
      }),
      this.deps.db.favoriteOffering.findMany({
        where: { userId: actorId },
        select: { offeringId: true },
      }),
    ]);

    return {
      listingIds: listings.map((row) => row.listingId),
      offeringIds: offerings.map((row) => row.offeringId),
    };
  }
}
