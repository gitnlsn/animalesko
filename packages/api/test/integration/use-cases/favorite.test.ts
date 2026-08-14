import { describe } from "vitest";

import { NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  ListFavoriteIdsUseCase,
  ListFavoriteListingsUseCase,
  ToggleFavoriteListingUseCase,
} from "../../../src/use-cases/favorite/favorite.use-cases.ts";
import { POINTS } from "../../../src/schemas/gamification.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

async function seedListing(db: TestDb) {
  const { org } = await createProviderSession(db);

  const pet = await db.pet.create({
    data: { name: "Luna", species: "DOG", custodianOrgId: org.id },
  });

  return db.adoptionListing.create({
    data: {
      petId: pet.id,
      orgId: org.id,
      status: "AVAILABLE",
      summary: "Luna é carinhosa e brincalhona.",
      city: "São Paulo",
      state: "SP",
      publishedAt: new Date(),
    },
  });
}

describe.concurrent("ToggleFavoriteListingUseCase", () => {
  test("adds then removes the favourite", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const listing = await seedListing(db);
    const useCase = new ToggleFavoriteListingUseCase({ db });

    const added = await useCase.execute({ actorId: user.id, listingId: listing.id });
    expect(added.favorited).toBe(true);

    const removed = await useCase.execute({ actorId: user.id, listingId: listing.id });
    expect(removed.favorited).toBe(false);

    const rows = await db.favoriteListing.count({ where: { userId: user.id } });
    expect(rows).toBe(0);
  });

  test("awards points once per listing, however many times it is re-favourited", async ({
    db,
    expect,
  }) => {
    const { user } = await createUserSession(db);
    const listing = await seedListing(db);
    const useCase = new ToggleFavoriteListingUseCase({ db });

    const first = await useCase.execute({ actorId: user.id, listingId: listing.id });
    expect(first.pointsAwarded).toBe(POINTS.FAVORITE_ADDED);

    // Un-favourite and favourite again. The prototype's client-side addPoints
    // would have paid out a second time here — 10 points per click, forever.
    await useCase.execute({ actorId: user.id, listingId: listing.id });
    const third = await useCase.execute({ actorId: user.id, listingId: listing.id });

    expect(third.favorited).toBe(true);
    expect(third.pointsAwarded).toBe(0);

    const profile = await db.gamificationProfile.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(profile.points).toBe(POINTS.FAVORITE_ADDED);

    const ledger = await db.pointsLedgerEntry.count({ where: { userId: user.id } });
    expect(ledger).toBe(1);
  });

  test("keeps the profile total equal to the sum of the ledger", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const useCase = new ToggleFavoriteListingUseCase({ db });

    for (let index = 0; index < 3; index += 1) {
      const listing = await seedListing(db);
      await useCase.execute({ actorId: user.id, listingId: listing.id });
    }

    const [profile, sum] = await Promise.all([
      db.gamificationProfile.findUniqueOrThrow({ where: { userId: user.id } }),
      db.pointsLedgerEntry.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
    ]);

    expect(profile.points).toBe(sum._sum.points);
    expect(profile.points).toBe(3 * POINTS.FAVORITE_ADDED);
  });

  test("rejects a listing that does not exist", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    await expect(
      new ToggleFavoriteListingUseCase({ db }).execute({
        actorId: user.id,
        listingId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("favourite reads", () => {
  test("return only the caller's rows", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const mine = await seedListing(db);
    const theirs = await seedListing(db);

    const toggle = new ToggleFavoriteListingUseCase({ db });
    await toggle.execute({ actorId: user.id, listingId: mine.id });
    await toggle.execute({ actorId: stranger.id, listingId: theirs.id });

    const listings = await new ListFavoriteListingsUseCase({ db }).execute({ actorId: user.id });
    expect(listings.map((listing) => listing.id)).toEqual([mine.id]);

    const ids = await new ListFavoriteIdsUseCase({ db }).execute({ actorId: user.id });
    expect(ids.listingIds).toEqual([mine.id]);
    expect(ids.offeringIds).toEqual([]);
  });
});
