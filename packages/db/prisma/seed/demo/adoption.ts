import { insertMany } from "../context.ts";
import {
  APPLICATION_MESSAGES,
  LISTING_STORIES,
  LISTING_SUMMARIES,
  PHOTOS_BY_SPECIES,
  photo,
} from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS, scatter } from "../rng.ts";

import type { DemoListing, DemoOrg, DemoPet, DemoUser, SeedContext } from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * Adoption listings, their photos and the applications against them.
 *
 * Status is assigned by position rather than drawn, because every one of the
 * five is a different screen in `plus` and a random draw at this size would
 * still, some of the time, produce a dataset with no ARCHIVED listing in it.
 */

type Status = DemoListing["status"];

/** Repeated over the listing list; the proportions are what matter. */
const STATUS_CYCLE: Status[] = [
  "AVAILABLE",
  "AVAILABLE",
  "AVAILABLE",
  "AVAILABLE",
  "AVAILABLE",
  "ADOPTED",
  "AVAILABLE",
  "AVAILABLE",
  "RESERVED",
  "AVAILABLE",
  "AVAILABLE",
  "DRAFT",
  "AVAILABLE",
  "ADOPTED",
  "AVAILABLE",
  "ARCHIVED",
];

const APPLICATION_TARGET = 90;

export interface AdoptionResult {
  listings: DemoListing[];
  /** Pets that changed hands, so downstream generators see the new owner. */
  adopted: { pet: DemoPet; ownerId: string }[];
}

export async function seedAdoption(
  ctx: SeedContext,
  world: {
    custodyPets: DemoPet[];
    ownedPets: DemoPet[];
    orgs: DemoOrg[];
    tutors: DemoUser[];
  },
): Promise<AdoptionResult> {
  const { db, rng, now } = ctx;

  const orgById = new Map(world.orgs.map((org) => [org.id, org]));
  const candidates = world.custodyPets.filter((pet) => pet.forAdoption);

  const listings: DemoListing[] = [];
  const listingRows: Prisma.AdoptionListingCreateManyInput[] = [];
  const photoRows: Prisma.AdoptionListingPhotoCreateManyInput[] = [];

  // The home screen's "Pets adotados / este mês" tile counts ADOPTED listings
  // whose `adoptedAt` falls inside the current calendar month. Nothing else
  // feeds it, so without a few deliberately recent adoptions the card reads 0
  // however much data is in the database.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysIntoMonth = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / DAY_MS));

  let photoIndex = 0;
  let adoptedSoFar = 0;

  candidates.forEach((pet, index) => {
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!;
    const org = orgById.get(pet.custodianOrgId!)!;
    const listingId = id("lst", index + 1);
    const point = scatter(rng, pet.city.lat, pet.city.lng, 10);

    const publishedAt =
      status === "DRAFT" ? null : new Date(now.getTime() - rng.int(1, 240) * DAY_MS);

    // Every third adoption is dated inside the current month; the rest are
    // spread back through the year so the number is not suspiciously round.
    const adoptedAt =
      status !== "ADOPTED"
        ? null
        : adoptedSoFar++ % 3 === 0
          ? new Date(now.getTime() - rng.int(0, daysIntoMonth - 1) * DAY_MS)
          : new Date(now.getTime() - rng.int(45, 300) * DAY_MS);

    listings.push({ id: listingId, petId: pet.id, orgId: org.id, status, petName: pet.name });

    listingRows.push({
      id: listingId,
      petId: pet.id,
      orgId: org.id,
      status,
      urgency: urgencyFor(pet),
      summary: fill(rng.pick(LISTING_SUMMARIES), pet),
      story: fill(rng.pick(LISTING_STORIES), pet),
      city: pet.city.name,
      state: pet.city.state,
      latitude: point.lat,
      longitude: point.lng,
      publishedAt,
      adoptedAt,
    });

    // The carousel on /pet/[id] is the one part of the consumer app that had
    // literally nothing to render before: `adoption_listing_photo` was an empty
    // table, so every listing fell back to the same placeholder image.
    const pool = PHOTOS_BY_SPECIES[pet.species]!;
    if (pool.length > 0) {
      const count = rng.int(1, Math.min(5, pool.length));
      for (let position = 0; position < count; position += 1) {
        photoRows.push({
          id: id("pho", (photoIndex += 1)),
          listingId,
          url: photo(pool[(index + position) % pool.length]!),
          position,
        });
      }
    }
  });

  await insertMany(listingRows, (batch) =>
    db.adoptionListing.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(photoRows, (batch) =>
    db.adoptionListingPhoto.createMany({ data: batch, skipDuplicates: true }),
  );

  const applications = await seedApplications(ctx, { listings, tutors: world.tutors });

  // --- The adoptions themselves --------------------------------------------
  //
  // Mirrors SetListingStatusUseCase exactly: the animal moves to the approved
  // applicant and the shelter releases custody. Skipping the second half would
  // leave adopted animals still counted in "animais sob guarda", which is the
  // state pets.prisma's own comment warns about.

  const petById = new Map(world.custodyPets.map((pet) => [pet.id, pet]));
  const adopted: { pet: DemoPet; ownerId: string }[] = [];

  for (const listing of listings) {
    if (listing.status !== "ADOPTED") continue;

    const approved = applications.approvedByListing.get(listing.id);
    if (!approved) continue;

    const pet = petById.get(listing.petId)!;
    await db.pet.update({
      where: { id: pet.id },
      data: { ownerId: approved, custodianOrgId: null },
    });

    pet.ownerId = approved;
    pet.custodianOrgId = null;
    pet.forAdoption = false;
    adopted.push({ pet, ownerId: approved });
  }

  return { listings, adopted };
}

/**
 * Applications, weighted towards the listings that are actually going somewhere.
 *
 * `plus /adocao/[id]` is the only place an application can be read, and the
 * consumer app has no procedure that creates one — the "Quero adotar" button
 * opens a conversation instead. So these rows exist only because the seed
 * writes them, and the review screen is empty without them.
 */
async function seedApplications(
  ctx: SeedContext,
  input: { listings: DemoListing[]; tutors: DemoUser[] },
): Promise<{ approvedByListing: Map<string, string> }> {
  const { db, rng, now } = ctx;

  const rows: Prisma.AdoptionApplicationCreateManyInput[] = [];
  const approvedByListing = new Map<string, string>();
  let index = 0;

  const open = input.listings.filter(
    (listing) => listing.status === "AVAILABLE" || listing.status === "RESERVED",
  );
  const adopted = input.listings.filter((listing) => listing.status === "ADOPTED");

  // Every completed adoption needs the applicant it went to, or the ownership
  // transfer below has nobody to transfer to.
  for (const listing of adopted) {
    const applicants = rng.sample(input.tutors, rng.int(1, 4));
    const winner = applicants[0]!;
    approvedByListing.set(listing.id, winner.id);

    applicants.forEach((tutor, position) => {
      const decidedAt = new Date(now.getTime() - rng.int(1, 60) * DAY_MS);
      rows.push({
        id: id("app", (index += 1)),
        listingId: listing.id,
        applicantId: tutor.id,
        status: position === 0 ? "APPROVED" : "REJECTED",
        message: rng.pick(APPLICATION_MESSAGES),
        answers: {
          moradia: rng.pick(["Casa com quintal", "Apartamento telado", "Casa sem quintal"]),
          outrosAnimais: rng.bool(0.5) ? "Sim" : "Não",
          horasSozinho: `${rng.int(0, 8)}h por dia`,
        },
        decidedAt,
      });
    });
  }

  // The rest are still in play, across the statuses `plus` can act on.
  const seen = new Set(rows.map((row) => `${row.listingId}:${row.applicantId}`));
  // Bounded so an exhausted combination space cannot spin: at ninety rows drawn
  // from ~90 listings × 37 tutors it never comes close, but a smaller run would.
  let attempts = 0;

  while (
    rows.length < APPLICATION_TARGET &&
    open.length > 0 &&
    attempts < APPLICATION_TARGET * 50
  ) {
    attempts += 1;

    const listing = rng.pick(open);
    const tutor = rng.pick(input.tutors);

    // `@@unique([listingId, applicantId])`. `skipDuplicates` would swallow the
    // collision, but it would also silently shrink the batch, and a target of
    // ninety that quietly delivers seventy is the kind of thing nobody notices
    // until a screen looks thin.
    const key = `${listing.id}:${tutor.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const status = rng.weighted([
      ["SUBMITTED", 5],
      ["IN_REVIEW", 3],
      ["REJECTED", 1],
      ["WITHDRAWN", 1],
    ] as const);

    rows.push({
      id: id("app", (index += 1)),
      listingId: listing.id,
      applicantId: tutor.id,
      status,
      message: rng.pick(APPLICATION_MESSAGES),
      answers: {
        moradia: rng.pick(["Casa com quintal", "Apartamento telado", "Casa sem quintal"]),
        outrosAnimais: rng.bool(0.5) ? "Sim" : "Não",
        horasSozinho: `${rng.int(0, 8)}h por dia`,
      },
      decidedAt:
        status === "REJECTED" || status === "WITHDRAWN"
          ? new Date(now.getTime() - rng.int(1, 40) * DAY_MS)
          : null,
    });
  }

  await insertMany(rows, (batch) =>
    db.adoptionApplication.createMany({ data: batch, skipDuplicates: true }),
  );

  return { approvedByListing };
}

// --- Helpers ----------------------------------------------------------------

/**
 * Urgency is derived rather than drawn, so the /adocao sort (urgency asc) lines
 * up with what the card actually says: a nine-year-old beagle labelled PUPPY
 * would undermine the whole band.
 */
function urgencyFor(pet: DemoPet): "URGENT" | "PUPPY" | "READY" {
  if (pet.ageMonths < 12) return "PUPPY";
  if (pet.ageMonths > 84) return "URGENT";
  return "READY";
}

function fill(template: string, pet: DemoPet): string {
  return template.replace(/\{name\}/g, pet.name).replace(/\{breed\}/g, pet.breed);
}
