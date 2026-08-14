import { insertMany } from "../context.ts";
import { id } from "../ids.ts";
import { DAY_MS } from "../rng.ts";

import type { DemoListing, DemoOffering, DemoUser, SeedContext } from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * Favourites, points and badges.
 *
 * Nothing here is invented. The ledger is derived from rows the earlier
 * generators already wrote, using the same amounts, reasons and `source` keys
 * the application uses when it awards them — `packages/api`'s
 * `POINTS`/`BADGE_THRESHOLDS` in `schemas/gamification.ts` and the three call
 * sites in the favorite, review and alert use cases.
 *
 * That is the difference between a gamification profile that looks plausible
 * and one that is actually reachable. The previous seed wrote three ledger rows
 * with invented sources; anything derived from them — a level, a progress bar,
 * a badge — described a user no sequence of real actions could produce.
 *
 * The constants are duplicated rather than imported because `packages/db` must
 * not depend on `packages/api`; the dependency runs the other way.
 */

/** POINTS in packages/api/src/schemas/gamification.ts. */
const POINTS = {
  REVIEW_CREATED: 20,
  FAVORITE_ADDED: 10,
  ALERT_SIGHTING: 50,
} as const;

/** BADGE_THRESHOLDS, same file. */
const BADGE_THRESHOLDS = {
  reviewer: 5,
  favorite_collector: 10,
  alert_hero: 3,
} as const;

const FAVORITE_LISTING_COUNT = 220;
const FAVORITE_OFFERING_COUNT = 90;

/** Enough favourites on the hero account to clear the "Colecionador" threshold. */
const HERO_FAVORITE_LISTINGS = 10;
const HERO_FAVORITE_OFFERINGS = 5;

export async function seedEngagement(
  ctx: SeedContext,
  world: {
    users: DemoUser[];
    tutors: DemoUser[];
    heroTutor: DemoUser;
    listings: DemoListing[];
    offerings: DemoOffering[];
  },
): Promise<void> {
  const { db, rng, now } = ctx;

  // --- Favourites -----------------------------------------------------------

  const favouritable = world.listings.filter(
    (listing) => listing.status === "AVAILABLE" || listing.status === "RESERVED",
  );
  const sellable = world.offerings.filter((offering) => offering.isActive);

  const listingRows: Prisma.FavoriteListingCreateManyInput[] = [];
  const offeringRows: Prisma.FavoriteOfferingCreateManyInput[] = [];
  const seenListings = new Set<string>();
  const seenOfferings = new Set<string>();

  function favouriteListing(user: DemoUser, listing: DemoListing): void {
    const key = `${user.id}:${listing.id}`;
    if (seenListings.has(key)) return;
    seenListings.add(key);

    listingRows.push({
      id: id("fvl", listingRows.length + 1),
      userId: user.id,
      listingId: listing.id,
      createdAt: new Date(now.getTime() - rng.int(1, 120) * DAY_MS),
    });
  }

  function favouriteOffering(user: DemoUser, offering: DemoOffering): void {
    const key = `${user.id}:${offering.id}`;
    if (seenOfferings.has(key)) return;
    seenOfferings.add(key);

    offeringRows.push({
      id: id("fvo", offeringRows.length + 1),
      userId: user.id,
      offeringId: offering.id,
      createdAt: new Date(now.getTime() - rng.int(1, 120) * DAY_MS),
    });
  }

  for (let n = 0; n < HERO_FAVORITE_LISTINGS && n < favouritable.length; n += 1) {
    favouriteListing(world.heroTutor, favouritable[(n * 3) % favouritable.length]!);
  }
  for (let n = 0; n < HERO_FAVORITE_OFFERINGS && n < sellable.length; n += 1) {
    favouriteOffering(world.heroTutor, sellable[(n * 7) % sellable.length]!);
  }

  let guard = 0;
  while (listingRows.length < FAVORITE_LISTING_COUNT && guard++ < FAVORITE_LISTING_COUNT * 20) {
    favouriteListing(rng.pick(world.tutors), rng.pick(favouritable));
  }

  guard = 0;
  while (offeringRows.length < FAVORITE_OFFERING_COUNT && guard++ < FAVORITE_OFFERING_COUNT * 20) {
    favouriteOffering(rng.pick(world.tutors), rng.pick(sellable));
  }

  await insertMany(listingRows, (batch) =>
    db.favoriteListing.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(offeringRows, (batch) =>
    db.favoriteOffering.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- The ledger -----------------------------------------------------------
  //
  // Read back rather than tracked in memory: these three generators ran in
  // three different modules, and reading what actually landed in the database
  // is the only way to be sure the ledger and the rows it claims to describe
  // agree.

  const [favourites, reviews, sightings] = await Promise.all([
    db.favoriteListing.findMany({ select: { userId: true, listingId: true, createdAt: true } }),
    db.review.findMany({ select: { id: true, authorId: true, createdAt: true } }),
    db.lostPetSighting.findMany({
      where: { reporterId: { not: null } },
      select: { alertId: true, reporterId: true, createdAt: true },
      distinct: ["alertId", "reporterId"],
    }),
  ]);

  const ledger: Prisma.PointsLedgerEntryCreateManyInput[] = [];
  let ledgerIndex = 0;

  // Favouriting a *pet* is worth ten points; favouriting a service is worth
  // none. That asymmetry is in the use case, not a mistake here — only
  // `FavoriteListing` calls awardPoints.
  for (const favourite of favourites) {
    ledger.push({
      id: id("pts", (ledgerIndex += 1)),
      userId: favourite.userId,
      points: POINTS.FAVORITE_ADDED,
      reason: "Favoritou um pet! 💚",
      source: `favorite_listing:${favourite.listingId}`,
      createdAt: favourite.createdAt,
    });
  }

  for (const review of reviews) {
    ledger.push({
      id: id("pts", (ledgerIndex += 1)),
      userId: review.authorId,
      points: POINTS.REVIEW_CREATED,
      reason: "Avaliou um prestador! ⭐",
      source: `review:${review.id}`,
      createdAt: review.createdAt,
    });
  }

  for (const sighting of sightings) {
    ledger.push({
      id: id("pts", (ledgerIndex += 1)),
      userId: sighting.reporterId!,
      points: POINTS.ALERT_SIGHTING,
      reason: "Ajudou um pet perdido! 🚨",
      source: `sighting:${sighting.alertId}`,
      createdAt: sighting.createdAt,
    });
  }

  await insertMany(ledger, (batch) =>
    db.pointsLedgerEntry.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- Badges ---------------------------------------------------------------
  //
  // Awarded against the same thresholds the application checks, so a user with
  // the "Avaliador" tile really does have five reviews behind it.
  //
  // `first_adoption` is deliberately never awarded: nothing in `packages/api`
  // awards it either — there is no consumer procedure that completes an
  // adoption — so every badge grid keeps at least one greyed-out tile, which is
  // both honest and the only way to see what an unearned badge looks like.

  const badges = await db.badge.findMany({ select: { id: true, code: true } });
  const badgeIdByCode = new Map(badges.map((badge) => [badge.code, badge.id]));

  const reviewsByUser = countBy(reviews.map((review) => review.authorId));
  const favouritesByUser = countBy([
    ...favourites.map((favourite) => favourite.userId),
    ...offeringRows.map((row) => row.userId),
  ]);
  const alertsHelpedByUser = countBy(sightings.map((sighting) => sighting.reporterId!));

  const awards: Prisma.UserBadgeCreateManyInput[] = [];
  let awardIndex = 0;

  function award(userId: string, code: keyof typeof BADGE_THRESHOLDS, count: number): void {
    if (count < BADGE_THRESHOLDS[code]) return;
    const badgeId = badgeIdByCode.get(code);
    if (!badgeId) return;

    awards.push({
      id: id("ubg", (awardIndex += 1)),
      userId,
      badgeId,
      awardedAt: new Date(now.getTime() - rng.int(1, 90) * DAY_MS),
    });
  }

  for (const user of world.users) {
    award(user.id, "reviewer", reviewsByUser.get(user.id) ?? 0);
    award(user.id, "favorite_collector", favouritesByUser.get(user.id) ?? 0);
    award(user.id, "alert_hero", alertsHelpedByUser.get(user.id) ?? 0);
  }

  await insertMany(awards, (batch) =>
    db.userBadge.createMany({ data: batch, skipDuplicates: true }),
  );
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
