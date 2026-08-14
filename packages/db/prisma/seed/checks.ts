import { DAY_MS, startOfDay } from "./rng.ts";

import type { Prisma, PrismaClient } from "../../src/index.ts";

/**
 * What the seed promises, checked against what it actually wrote.
 *
 * Every entry here corresponds to a screen that renders its empty state — or
 * renders a zero — unless a specific and easily-missed condition holds. The
 * previous seed failed nine of them, silently: nothing was broken, the data was
 * simply not there, and the only way to find out was to open each page.
 *
 * A failure exits the seed non-zero, so this doubles as the regression test for
 * a dataset that is otherwise only verifiable by looking at it.
 */

export interface Check {
  name: string;
  /** What the screen needs, in the reviewer's terms. */
  needs: string;
  actual: number;
  /** One of the two is set; `maximum` is for the checks that count defects. */
  minimum?: number;
  maximum?: number;
}

/**
 * The same box `ListAlertsUseCase` builds, with the same constant, around the
 * centre `/pet-alert` falls back to when the browser refuses geolocation.
 * Recomputing it rather than hardcoding degrees keeps the check honest if the
 * fallback ever moves.
 */
const KM_PER_DEGREE_LAT = 111.32;
const ALERT_FALLBACK = { lat: -23.5505, lng: -46.6333, radiusKm: 100 };

function alertBoundingBox() {
  const latSpan = ALERT_FALLBACK.radiusKm / KM_PER_DEGREE_LAT;
  const lngSpan =
    ALERT_FALLBACK.radiusKm /
    (KM_PER_DEGREE_LAT * Math.max(0.01, Math.cos((ALERT_FALLBACK.lat * Math.PI) / 180)));

  return {
    lastSeenLat: { gte: ALERT_FALLBACK.lat - latSpan, lte: ALERT_FALLBACK.lat + latSpan },
    lastSeenLng: { gte: ALERT_FALLBACK.lng - lngSpan, lte: ALERT_FALLBACK.lng + lngSpan },
  };
}

export async function runChecks(db: PrismaClient, now: Date): Promise<Check[]> {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inThirtyDays = new Date(now.getTime() + 30 * DAY_MS);

  // Not `as const`: Prisma's `in` filter takes a mutable array.
  const live: Prisma.EnumAppointmentStatusFilter = { in: ["PENDING", "CONFIRMED"] };

  const [
    adoptedThisMonth,
    appointmentsToday,
    vaccinesOverdue,
    vaccinesDueSoon,
    daycareOfferings,
    hotelOfferings,
    listingsWithPhotos,
    premiumWithManyPets,
    pendingReviews,
    writtenReviews,
    patients,
    unreadThreads,
    alertsNearCapital,
    unpaidBookings,
    partialBadges,
    multiOrgMembers,
    rejectedVerifications,
    listingStatuses,
    bookingStatuses,
    bookingMonths,
    siblingShelters,
  ] = await Promise.all([
    db.adoptionListing.count({ where: { status: "ADOPTED", adoptedAt: { gte: monthStart } } }),
    db.appointment.count({
      where: { status: live, scheduledAt: { gte: today, lt: tomorrow } },
    }),
    db.vaccination.count({
      where: { nextDoseAt: { lt: now }, pet: { custodianOrgId: { not: null }, deceasedAt: null } },
    }),
    db.vaccination.count({
      where: {
        nextDoseAt: { gte: now, lte: inThirtyDays },
        pet: { custodianOrgId: { not: null }, deceasedAt: null },
      },
    }),
    db.serviceOffering.count({ where: { type: "DAYCARE", isActive: true } }),
    db.serviceOffering.count({ where: { type: "HOTEL", isActive: true } }),
    db.adoptionListing.count({
      where: { status: { in: ["AVAILABLE", "RESERVED"] }, photos: { none: {} } },
    }),
    db.user.count({ where: { subscription: { tier: "PREMIUM" }, pets: { some: {} } } }),
    db.booking.count({ where: { status: "COMPLETED", review: null } }),
    db.review.count(),
    // A pet a clinic has an appointment for but does not hold — the PATIENT
    // half of the relation filter on `plus /animais`.
    db.pet.count({
      where: { custodianOrgId: null, deceasedAt: null, appointments: { some: {} } },
    }),
    db.conversation.count({ where: { messages: { some: {} } } }),
    // The board hides RESOLVED alerts by default, so a resolved one inside the
    // box is not something a reviewer would see.
    db.lostPetAlert.count({
      where: { status: { in: ["LOST", "FOUND"] }, ...alertBoundingBox() },
    }),
    db.booking.count({ where: { payment: null } }),
    // Users who have earned some badges but not all of them, so the grid shows
    // both an earned and an unearned tile.
    db.user.count({ where: { badges: { some: {} } } }),
    db.user.count({ where: { memberships: { some: {} } } }),
    db.providerVerification.count({ where: { status: "REJECTED" } }),
    db.adoptionListing.groupBy({ by: ["status"] }).then((rows) => rows.length),
    db.booking.groupBy({ by: ["status"] }).then((rows) => rows.length),
    db.booking
      .findMany({ select: { startsAt: true } })
      .then(
        (rows) =>
          new Set(rows.map((row) => `${row.startsAt.getFullYear()}-${row.startsAt.getMonth()}`))
            .size,
      ),
    db.organization
      .findMany({
        where: { type: "SHELTER" },
        select: { _count: { select: { adoptionListings: true } } },
      })
      .then((rows) => rows.filter((row) => row._count.adoptionListings >= 5).length),
  ]);

  return [
    {
      name: "adoptions this month",
      needs:
        'app / — the "Pets adotados" tile counts ADOPTED listings with adoptedAt in this month',
      actual: adoptedThisMonth,
      minimum: 1,
    },
    {
      name: "appointments today",
      needs: 'plus / — "Agenda de hoje" and the first tile read rows dated on the calendar day',
      actual: appointmentsToday,
      minimum: 10,
    },
    {
      name: "vaccines overdue",
      needs: 'plus / — the overdue half of "Vacinas a vencer" (custody animals only)',
      actual: vaccinesOverdue,
      minimum: 5,
    },
    {
      name: "vaccines due within 30d",
      needs: 'plus / — the upcoming half of "Vacinas a vencer"',
      actual: vaccinesDueSoon,
      minimum: 5,
    },
    {
      name: "daycare offerings",
      needs: "app /servicos — the Creche tab has no other source",
      actual: daycareOfferings,
      minimum: 3,
    },
    {
      name: "hotel offerings",
      needs: "app /servicos — the Hotel tab has no other source",
      actual: hotelOfferings,
      minimum: 3,
    },
    {
      name: "published listings without photos",
      needs: "app /pet/[id] — the carousel falls back to one placeholder for any listing with none",
      actual: listingsWithPhotos,
      maximum: 0,
    },
    {
      name: "premium tutors with pets",
      needs: "app /meus-pets — the unlimited-quota branch and the >50 pagination window",
      actual: premiumWithManyPets,
      minimum: 1,
    },
    {
      name: "completed services awaiting review",
      needs: 'app /avaliacoes — the "aguardando sua avaliação" section',
      actual: pendingReviews,
      minimum: 20,
    },
    {
      name: "reviews written",
      needs: "app /avaliacoes and every provider rating",
      actual: writtenReviews,
      minimum: 20,
    },
    {
      name: "patients not in custody",
      needs: "plus /animais — the PATIENT half of the relation filter",
      actual: patients,
      minimum: 10,
    },
    {
      name: "conversations with messages",
      needs: "app /mensagens",
      actual: unreadThreads,
      minimum: 20,
    },
    {
      name: "alerts near São Paulo",
      needs: "app /pet-alert — the ±100 km box the map falls back to",
      actual: alertsNearCapital,
      minimum: 10,
    },
    {
      name: "bookings without payment",
      needs: "app /pagamento — needs a booking left to pay for",
      actual: unpaidBookings,
      minimum: 1,
    },
    {
      name: "users with badges",
      needs: "app /perfil — the badge grid, which is all grey without these",
      actual: partialBadges,
      minimum: 1,
    },
    {
      name: "users with a membership",
      needs: "plus — the whole app is gated on OrganizationMember",
      actual: multiOrgMembers,
      minimum: 15,
    },
    {
      name: "rejected verifications",
      needs: "plus /organizacao — the REJECTED card and its rejectionReason",
      actual: rejectedVerifications,
      minimum: 1,
    },
    {
      name: "distinct listing statuses",
      needs: "plus /adocao — all five of DRAFT/AVAILABLE/RESERVED/ADOPTED/ARCHIVED",
      actual: listingStatuses,
      minimum: 5,
    },
    {
      name: "distinct booking statuses",
      needs: "app /historico — the four tabs are drawn from these",
      actual: bookingStatuses,
      minimum: 6,
    },
    {
      name: "distinct booking months",
      needs: "app /historico — rows are grouped under month headings",
      actual: bookingMonths,
      minimum: 6,
    },
    {
      name: "shelters with 5+ listings",
      needs: "app /pet/[id] — the siblings strip takes four from the same shelter",
      actual: siblingShelters,
      minimum: 1,
    },
  ];
}

export function reportChecks(checks: Check[]): boolean {
  const width = Math.max(...checks.map((check) => check.name.length));
  let failed = 0;

  console.info("");
  console.info("  Coverage");

  for (const check of checks) {
    const bound = check.maximum ?? check.minimum ?? 0;
    const ok = check.maximum === undefined ? check.actual >= bound : check.actual <= bound;
    if (!ok) failed += 1;

    const label = check.maximum === undefined ? `min ${bound}` : `max ${bound}`;

    console.info(
      `  ${ok ? "✓" : "✗"} ${check.name.padEnd(width)}  ${String(check.actual).padStart(5)}  (${label})`,
    );

    if (!ok) console.info(`      ${check.needs}`);
  }

  console.info("");

  if (failed > 0) {
    console.error(`  ${failed} coverage check(s) failed — some screens will render empty.`);
  }

  return failed === 0;
}
