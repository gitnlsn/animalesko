import { insertMany, phoneFor } from "../context.ts";
import {
  ALERT_DESCRIPTIONS,
  BREEDS_BY_SPECIES,
  CITIES,
  LANDMARKS,
  LISTING_THREADS,
  NOTIFICATION_TEMPLATES,
  PET_NAMES,
  PHOTOS_BY_SPECIES,
  SERVICE_THREADS,
  SIGHTING_NOTES,
  photo,
} from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS, HOUR_MS, MINUTE_MS, scatter } from "../rng.ts";

import type {
  DemoBooking,
  DemoListing,
  DemoOrg,
  DemoPet,
  DemoUser,
  SeedContext,
  Species,
} from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * Lost-pet alerts, conversations and notifications — everything the prototypes
 * kept in `localStorage`, which is why nobody but the person who wrote it could
 * ever see any of it.
 */

const ALERT_COUNT = 45;
/** Alerts inside the ±100 km box /pet-alert falls back to when geolocation is denied. */
const ALERTS_NEAR_CAPITAL = 31;
const CONVERSATION_COUNT = 50;
const NOTIFICATION_COUNT = 400;

const ALERT_SPECIES = [
  ["DOG", 6],
  ["CAT", 4],
  ["BIRD", 1],
] as const satisfies readonly (readonly [Species, number])[];

export async function seedCommunity(
  ctx: SeedContext,
  world: {
    users: DemoUser[];
    tutors: DemoUser[];
    heroTutor: DemoUser;
    orgs: DemoOrg[];
    listings: DemoListing[];
    bookings: DemoBooking[];
    ownedPets: DemoPet[];
  },
): Promise<void> {
  await seedAlerts(ctx, world);
  await seedConversations(ctx, world);
  await seedNotifications(ctx, world);
}

// --- Lost pets --------------------------------------------------------------

async function seedAlerts(
  ctx: SeedContext,
  world: { tutors: DemoUser[]; heroTutor: DemoUser; ownedPets: DemoPet[] },
): Promise<void> {
  const { db, rng, now } = ctx;

  const alertRows: Prisma.LostPetAlertCreateManyInput[] = [];
  const photoRows: Prisma.LostPetAlertPhotoCreateManyInput[] = [];
  const sightingRows: Prisma.LostPetSightingCreateManyInput[] = [];

  let photoIndex = 0;
  let sightingIndex = 0;

  const petsByOwner = new Map<string, DemoPet[]>();
  for (const pet of world.ownedPets) {
    const list = petsByOwner.get(pet.ownerId!) ?? [];
    list.push(pet);
    petsByOwner.set(pet.ownerId!, list);
  }

  for (let n = 0; n < ALERT_COUNT; n += 1) {
    // The board centres on the browser's location and falls back to São Paulo,
    // then filters to a bounding box 100 km on a side. Alerts outside it are
    // invisible on a first visit, so most of them are inside it — and enough
    // are not that the filter is visibly doing something.
    const nearCapital = n < ALERTS_NEAR_CAPITAL;
    const city = nearCapital ? rng.pick(CITIES.slice(0, 5)) : rng.pick(CITIES.slice(6));
    const point = scatter(rng, city.lat, city.lng, nearCapital ? 25 : 15);

    // The hero tutor reports the first two, so the "meus alertas" path has rows
    // for the account a reviewer is signed in as.
    const reporter = n < 2 ? world.heroTutor : rng.pick(world.tutors);
    const species = rng.weighted(ALERT_SPECIES);
    const status = n < 30 ? "LOST" : n < 38 ? "FOUND" : "RESOLVED";
    const daysAgo = rng.int(1, 45);

    // Some alerts are about an animal the reporter has registered, which is what
    // the `petId` link is for; most are not, because most people file an alert
    // in a panic before they have registered anything.
    const own = petsByOwner.get(reporter.id) ?? [];
    const linked = own.length > 0 && rng.bool(0.3) ? rng.pick(own) : null;

    const alertId = id("alr", n + 1);

    alertRows.push({
      id: alertId,
      status,
      name: linked?.name ?? PET_NAMES[(n * 7) % PET_NAMES.length]!,
      species: linked?.species ?? species,
      breed: linked?.breed ?? rng.pick(BREEDS_BY_SPECIES[species]!),
      description: rng.pick(ALERT_DESCRIPTIONS),
      lastSeenLat: point.lat,
      lastSeenLng: point.lng,
      lastSeenAddress: nearCapital
        ? `${rng.pick(LANDMARKS)} — ${city.name}`
        : `${rng.pick(LANDMARKS)}, ${city.name}/${city.state}`,
      lastSeenAt: new Date(now.getTime() - daysAgo * DAY_MS),
      contactName: reporter.name,
      contactPhone: phoneFor(rng, city),
      reporterId: reporter.id,
      petId: linked?.id ?? null,
      resolvedAt: status === "RESOLVED" ? new Date(now.getTime() - rng.int(1, 10) * DAY_MS) : null,
      createdAt: new Date(now.getTime() - daysAgo * DAY_MS),
    });

    const pool = PHOTOS_BY_SPECIES[linked?.species ?? species]!;
    for (
      let position = 0;
      position < rng.int(1, Math.min(3, Math.max(1, pool.length)));
      position += 1
    ) {
      if (pool.length === 0) break;
      photoRows.push({
        id: id("aph", (photoIndex += 1)),
        alertId,
        url: photo(pool[(n + position) % pool.length]!),
        position,
      });
    }

    // Sightings are the reason the board is shared rather than personal: they
    // are strangers adding to somebody else's alert.
    //
    // The hero tutor is the first to respond on four of them. That is not
    // decoration: "Herói do Alert" is awarded for helping on three distinct
    // alerts, so without it the badge grid on /perfil has one fewer earned tile
    // and fifty points less on the ledger.
    const heroAlert = n >= 2 && n < 6;
    const sightings = heroAlert ? rng.int(1, 3) : rng.int(0, 3);

    for (let s = 0; s < sightings; s += 1) {
      const seen = scatter(rng, point.lat, point.lng, 4);
      const heroHelps = s === 0 && heroAlert;

      sightingRows.push({
        id: id("sig", (sightingIndex += 1)),
        alertId,
        reporterId: heroHelps ? world.heroTutor.id : rng.pick(world.tutors).id,
        latitude: seen.lat,
        longitude: seen.lng,
        address: `${rng.pick(LANDMARKS)} — ${city.name}`,
        note: rng.pick(SIGHTING_NOTES),
        sightedAt: new Date(now.getTime() - rng.int(0, daysAgo) * DAY_MS),
      });
    }
  }

  await insertMany(alertRows, (batch) =>
    db.lostPetAlert.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(photoRows, (batch) =>
    db.lostPetAlertPhoto.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(sightingRows, (batch) =>
    db.lostPetSighting.createMany({ data: batch, skipDuplicates: true }),
  );
}

// --- Messaging --------------------------------------------------------------

/**
 * Threads, each anchored to the thing it is about.
 *
 * All three anchors are optional on `Conversation`, and all three are used here:
 * a listing thread is what the consumer "Quero adotar" button opens, a booking
 * thread is a tutor and a provider sorting out a service, and an unanchored one
 * is a plain question to an organization.
 */
async function seedConversations(
  ctx: SeedContext,
  world: {
    tutors: DemoUser[];
    heroTutor: DemoUser;
    orgs: DemoOrg[];
    listings: DemoListing[];
    bookings: DemoBooking[];
  },
): Promise<void> {
  const { db, rng, now } = ctx;

  const orgById = new Map(world.orgs.map((org) => [org.id, org]));
  const openListings = world.listings.filter((listing) => listing.status === "AVAILABLE");

  const conversationRows: Prisma.ConversationCreateManyInput[] = [];
  const participantRows: Prisma.ConversationParticipantCreateManyInput[] = [];
  const messageRows: Prisma.MessageCreateManyInput[] = [];

  let participantIndex = 0;
  let messageIndex = 0;
  const usedBookings = new Set<string>();

  for (let n = 0; n < CONVERSATION_COUNT; n += 1) {
    const kind = n % 10 < 4 ? "listing" : n % 10 < 7 ? "booking" : "org";

    let orgId: string;
    let listingId: string | null = null;
    let bookingId: string | null = null;
    let tutor: DemoUser;
    let script: string[];
    let petName = "";

    if (kind === "listing" && openListings.length > 0) {
      const listing = openListings[(n * 3) % openListings.length]!;
      orgId = listing.orgId;
      listingId = listing.id;
      petName = listing.petName;
      tutor = n < 3 ? world.heroTutor : rng.pick(world.tutors);
      script = rng.pick(LISTING_THREADS);
    } else if (kind === "booking") {
      // `Conversation.bookingId` is unique, so each booking anchors at most one
      // thread; picking without tracking would drop rows to skipDuplicates.
      const candidate = world.bookings.find((booking) => !usedBookings.has(booking.id));
      if (!candidate) continue;
      usedBookings.add(candidate.id);

      orgId = candidate.orgId;
      bookingId = candidate.id;
      tutor = world.tutors.find((user) => user.id === candidate.tutorId) ?? world.heroTutor;
      script = rng.pick(SERVICE_THREADS);
    } else {
      const org = rng.pick(world.orgs);
      orgId = org.id;
      tutor = n < 8 ? world.heroTutor : rng.pick(world.tutors);
      script = rng.pick(SERVICE_THREADS);
    }

    const org = orgById.get(orgId)!;
    const staffId = org.ownerId;
    if (staffId === tutor.id) continue;

    const conversationId = id("cnv", n + 1);
    const startedMinutesAgo = rng.int(60, 60 * 24 * 20);
    const step = Math.max(5, Math.floor(startedMinutesAgo / (script.length + 1)));

    const times = script.map(
      (_, position) => new Date(now.getTime() - (startedMinutesAgo - position * step) * MINUTE_MS),
    );
    const lastMessageAt = times[times.length - 1]!;

    conversationRows.push({
      id: conversationId,
      orgId,
      listingId,
      bookingId,
      lastMessageAt,
      createdAt: times[0]!,
    });

    // The tutor read up to just before the final message, so the unread badge on
    // /mensagens has a number in it. A thread where everyone has read everything
    // renders the same as a thread with no messages at all.
    const unread = n % 3 !== 0;

    participantRows.push(
      {
        id: id("prt", (participantIndex += 1)),
        conversationId,
        userId: tutor.id,
        lastReadAt: unread ? new Date(lastMessageAt.getTime() - step * MINUTE_MS) : lastMessageAt,
        createdAt: times[0]!,
      },
      {
        id: id("prt", (participantIndex += 1)),
        conversationId,
        userId: staffId,
        lastReadAt: lastMessageAt,
        createdAt: times[0]!,
      },
    );

    script.forEach((body, position) => {
      messageRows.push({
        id: id("msg", (messageIndex += 1)),
        conversationId,
        // The script alternates: the tutor opens, the organization replies.
        senderId: position % 2 === 0 ? tutor.id : staffId,
        body: body.replace(/\{pet\}/g, petName || "o pet"),
        createdAt: times[position]!,
      });
    });

    // One thread carries a photo, because `Message.imageUrl` is a column the
    // chat renders differently and nothing else in the seed exercises it.
    if (n === 1 && petName) {
      messageRows.push({
        id: id("msg", (messageIndex += 1)),
        conversationId,
        senderId: staffId,
        body: null,
        imageUrl: photo(PHOTOS_BY_SPECIES.DOG![n % PHOTOS_BY_SPECIES.DOG!.length]!, 600, 600),
        createdAt: new Date(lastMessageAt.getTime() + MINUTE_MS),
      });
    }
  }

  await insertMany(conversationRows, (batch) =>
    db.conversation.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(participantRows, (batch) =>
    db.conversationParticipant.createMany({ data: batch, skipDuplicates: true }),
  );
  await insertMany(messageRows, (batch) =>
    db.message.createMany({ data: batch, skipDuplicates: true }),
  );
}

// --- Notifications ----------------------------------------------------------

async function seedNotifications(
  ctx: SeedContext,
  world: { users: DemoUser[]; heroTutor: DemoUser },
): Promise<void> {
  const { db, rng, now } = ctx;

  const rows: Prisma.NotificationCreateManyInput[] = [];
  let index = 0;

  // The bell in both headers shows an unread count, so the hero accounts get a
  // guaranteed run of recent unread items rather than whatever the spread gave.
  for (let n = 0; n < 6; n += 1) {
    const template = NOTIFICATION_TEMPLATES[n % NOTIFICATION_TEMPLATES.length]!;
    const createdAt = new Date(now.getTime() - (n + 1) * 2 * HOUR_MS);

    rows.push({
      id: id("ntf", (index += 1)),
      userId: world.heroTutor.id,
      type: template.type as Prisma.NotificationCreateManyInput["type"],
      title: template.title,
      body: template.body,
      href: template.href,
      createdAt,
      readAt: n >= 4 ? createdAt : null,
    });
  }

  while (index < NOTIFICATION_COUNT) {
    const user = rng.pick(world.users);
    const template = rng.pick(NOTIFICATION_TEMPLATES);
    const createdAt = new Date(now.getTime() - rng.int(1, 24 * 45) * HOUR_MS);

    rows.push({
      id: id("ntf", (index += 1)),
      userId: user.id,
      type: template.type as Prisma.NotificationCreateManyInput["type"],
      title: template.title,
      body: template.body,
      href: template.href,
      createdAt,
      readAt: rng.bool(0.55) ? new Date(createdAt.getTime() + rng.int(1, 48) * HOUR_MS) : null,
    });
  }

  await insertMany(rows, (batch) =>
    db.notification.createMany({ data: batch, skipDuplicates: true }),
  );
}
