import { insertMany } from "../context.ts";
import { APPOINTMENT_NOTES, REVIEW_COMMENTS, WALK_IN_SERVICES } from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS, atTime, daysFrom, startOfDay } from "../rng.ts";

import type {
  DemoBooking,
  DemoClientContact,
  DemoOffering,
  DemoOrg,
  DemoPet,
  DemoUser,
  SeedContext,
} from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * Bookings and everything that hangs off them.
 *
 * A booking is the seam between the two applications: the tutor makes it in
 * `app`, and the provider sees the mirrored `Appointment` in `plus`. Seeding one
 * without the other is what made the previous dataset look complete on one side
 * and empty on the other.
 */

const BOOKING_COUNT = 400;
const WALK_IN_COUNT = 440;
/** Per organization, so every `plus` account has an agenda on the day you open it. */
const TODAY_PER_ORG = 3;

/** Fraction of completed bookings that got reviewed — the rest feed /avaliacoes. */
const REVIEW_RATE = 0.45;

/**
 * The five codes the previous seed used.
 *
 * They are quoted in support conversations and in the README's screenshots, and
 * they cost nothing to preserve, so the hero tutor's history opens on exactly
 * the bookings anyone who used the old seed remembers.
 */
const HERO_CODES = ["ANM-7QK4D2", "ANM-3XB8N5", "ANM-9WT2H7", "ANM-5RM6C1", "ANM-1JD4K8"];

/**
 * How many bookings belong to the hero tutor.
 *
 * Well past the five preserved ones, because three separate screens are read
 * from this account and each needs a different slice of it: `/historico` needs
 * every status, `/avaliacoes` needs completed services both with and without a
 * review, and the "Avaliador" badge needs five reviews before it lights up.
 */
const HERO_BOOKING_COUNT = 16;

/** Reviews written by the hero tutor — five is the "Avaliador" threshold. */
const HERO_REVIEW_COUNT = 5;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface CommerceResult {
  bookings: DemoBooking[];
}

export async function seedCommerce(
  ctx: SeedContext,
  world: {
    tutors: DemoUser[];
    heroTutor: DemoUser;
    orgs: DemoOrg[];
    offerings: DemoOffering[];
    ownedPets: DemoPet[];
    custodyPets: DemoPet[];
    clientContacts: DemoClientContact[];
  },
): Promise<CommerceResult> {
  const { db, rng, now } = ctx;

  const orgById = new Map(world.orgs.map((org) => [org.id, org]));
  const petsByOwner = new Map<string, DemoPet[]>();
  for (const pet of world.ownedPets) {
    const list = petsByOwner.get(pet.ownerId!) ?? [];
    list.push(pet);
    petsByOwner.set(pet.ownerId!, list);
  }

  const bookableTutors = world.tutors.filter(
    (tutor) => (petsByOwner.get(tutor.id)?.length ?? 0) > 0,
  );
  const sellableOfferings = world.offerings.filter((offering) => offering.isActive);

  const bookings: DemoBooking[] = [];
  const bookingRows: Prisma.BookingCreateManyInput[] = [];

  for (let index = 0; index < BOOKING_COUNT; index += 1) {
    // The hero tutor takes the first sixteen, so their /historico has rows in
    // every one of the four tabs rather than whatever the draw happened to give.
    const hero = index < HERO_BOOKING_COUNT;
    const tutor = hero ? world.heroTutor : rng.pick(bookableTutors);
    const pet = rng.pick(petsByOwner.get(tutor.id)!);
    const offering = rng.pick(sellableOfferings);

    // Ten months wide, so /historico groups into at least six month headings
    // and the "futuros" / "realizados" split has both sides populated.
    const daysFromNow = hero ? HERO_OFFSETS[index]! : rng.int(-240, 60);
    const startsAt = atTime(daysFrom(now, daysFromNow), rng.int(7, 19), rng.pick([0, 30]));
    const durationMinutes = offering.durationMinutes;
    const status = hero ? HERO_STATUSES[index]! : statusFor(rng, daysFromNow);

    const booking: DemoBooking = {
      id: id("bkg", index + 1),
      code: index < HERO_CODES.length ? HERO_CODES[index]! : codeFor(index + 1),
      tutorId: tutor.id,
      petId: pet.id,
      offeringId: offering.id,
      orgId: offering.orgId,
      status,
      startsAt,
      priceCents: offering.priceCents,
      reviewed: false,
    };

    bookings.push(booking);

    bookingRows.push({
      id: booking.id,
      code: booking.code,
      status,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
      priceCents: offering.priceCents,
      notes: rng.pick(APPOINTMENT_NOTES),
      cancelledAt: status === "CANCELLED" ? new Date(startsAt.getTime() - 2 * DAY_MS) : null,
      cancellationReason: status === "CANCELLED" ? rng.pick(CANCELLATION_REASONS) : null,
      tutorId: tutor.id,
      petId: pet.id,
      offeringId: offering.id,
      orgId: offering.orgId,
      // Booked somewhere between a fortnight and a day before it happens.
      createdAt: new Date(startsAt.getTime() - rng.int(1, 14) * DAY_MS),
    });
  }

  await insertMany(bookingRows, (batch) =>
    db.booking.createMany({ data: batch, skipDuplicates: true }),
  );

  await seedPayments(ctx, bookings);
  await seedReviews(ctx, bookings, world.heroTutor.id);
  await seedAppointments(ctx, {
    bookings,
    orgs: world.orgs,
    orgById,
    clientContacts: world.clientContacts,
    custodyPets: world.custodyPets,
    ownedPets: world.ownedPets,
    offerings: world.offerings,
  });

  return { bookings };
}

/**
 * The hero tutor's history, by hand.
 *
 * The first five are the preserved bookings, at the offsets and statuses they
 * always had. The rest exist to spread the account across ten months and to
 * leave nine completed services — five reviewed, four not.
 */
const HERO_OFFSETS = [-12, -30, 2, 9, -5, -48, -75, -103, -134, -166, -197, -228, 5, 16, 27, -60];
const HERO_STATUSES: DemoBooking["status"][] = [
  "COMPLETED",
  "COMPLETED",
  "CONFIRMED",
  "PENDING",
  "CANCELLED",
  "COMPLETED",
  "COMPLETED",
  "COMPLETED",
  "COMPLETED",
  "COMPLETED",
  "COMPLETED",
  "COMPLETED",
  "CONFIRMED",
  "PENDING",
  "CONFIRMED",
  "NO_SHOW",
];

const CANCELLATION_REASONS = [
  "Mudança de planos.",
  "Imprevisto no trabalho.",
  "O prestador não pôde atender no horário.",
  "Pet ficou doente.",
];

// --- Payments ---------------------------------------------------------------

/**
 * Not every booking is paid.
 *
 * `/pagamento` takes a booking id and writes a real `Payment` row, so it needs a
 * booking that has none — and the hero tutor's PENDING booking is the one it
 * gets, deliberately, because that is the screen a reviewer will try.
 */
async function seedPayments(ctx: SeedContext, bookings: DemoBooking[]): Promise<void> {
  const { db, rng } = ctx;

  const rows: Prisma.PaymentCreateManyInput[] = [];
  let index = 0;

  for (const booking of bookings) {
    if (booking.status === "PENDING") continue;
    if (booking.status === "CANCELLED" && rng.bool(0.5)) continue;

    const status =
      booking.status === "CANCELLED"
        ? rng.weighted([
            ["REFUNDED", 3],
            ["PAID", 1],
          ] as const)
        : booking.status === "NO_SHOW"
          ? "PAID"
          : rng.weighted([
              ["PAID", 20],
              ["PENDING", 2],
              ["FAILED", 1],
            ] as const);

    const method = rng.weighted([
      ["PIX", 6],
      ["CREDIT_CARD", 4],
      ["DEBIT_CARD", 2],
      ["CASH", 1],
    ] as const);

    rows.push({
      id: id("pay", (index += 1)),
      bookingId: booking.id,
      amountCents: booking.priceCents,
      method,
      status,
      gatewayRef: method === "CASH" ? null : `pay_demo_${String(index).padStart(4, "0")}`,
      pixPayload:
        method === "PIX"
          ? `00020126BR.GOV.BCB.PIX${String(index).padStart(6, "0")}5204000053039865802BR`
          : null,
      paidAt: status === "PAID" || status === "REFUNDED" ? booking.startsAt : null,
      refundedAt: status === "REFUNDED" ? new Date(booking.startsAt.getTime() + DAY_MS) : null,
    });
  }

  await insertMany(rows, (batch) => db.payment.createMany({ data: batch, skipDuplicates: true }));
}

// --- Reviews ----------------------------------------------------------------

/**
 * Roughly half of completed services get reviewed.
 *
 * The unreviewed half is not an oversight — `/avaliacoes` has an "aguardando
 * sua avaliação" section fed entirely by COMPLETED bookings with no review, and
 * reviewing everything would leave it permanently empty.
 */
async function seedReviews(
  ctx: SeedContext,
  bookings: DemoBooking[],
  heroTutorId: string,
): Promise<void> {
  const { db, rng, now } = ctx;

  const rows: Prisma.ReviewCreateManyInput[] = [];
  let index = 0;
  let heroReviews = 0;

  for (const booking of bookings) {
    if (booking.status !== "COMPLETED") continue;

    if (booking.tutorId === heroTutorId) {
      // Exactly five, so the "Avaliador" badge is earned and the rest of the
      // account's completed services stay in the "aguardando sua avaliação"
      // section of /avaliacoes. Left to the coin flip below, a run could
      // produce an account that has written none, or one that has written them
      // all — and either empties a screen.
      if (heroReviews >= HERO_REVIEW_COUNT) continue;
      heroReviews += 1;
    } else if (!rng.bool(REVIEW_RATE)) {
      continue;
    }

    const template = rng.weighted(
      REVIEW_COMMENTS.map((entry) => [entry, entry.rating >= 4 ? 5 : 1] as const),
    );

    booking.reviewed = true;

    rows.push({
      id: id("rev", (index += 1)),
      bookingId: booking.id,
      authorId: booking.tutorId,
      orgId: booking.orgId,
      rating: template.rating,
      comment: template.comment,
      // Written a few days after the service, never before it happened.
      createdAt: new Date(
        Math.min(now.getTime(), booking.startsAt.getTime() + rng.int(1, 10) * DAY_MS),
      ),
    });
  }

  await insertMany(rows, (batch) => db.review.createMany({ data: batch, skipDuplicates: true }));
}

// --- Appointments -----------------------------------------------------------

const BOOKING_TO_APPOINTMENT: Record<
  DemoBooking["status"],
  Prisma.AppointmentCreateManyInput["status"]
> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  // `AppointmentStatus` has no IN_PROGRESS: from the provider's side a service
  // under way is simply one they have confirmed and not yet closed.
  IN_PROGRESS: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

async function seedAppointments(
  ctx: SeedContext,
  input: {
    bookings: DemoBooking[];
    orgs: DemoOrg[];
    orgById: Map<string, DemoOrg>;
    clientContacts: DemoClientContact[];
    custodyPets: DemoPet[];
    ownedPets: DemoPet[];
    offerings: DemoOffering[];
  },
): Promise<void> {
  const { db, rng, now } = ctx;

  const offeringById = new Map(input.offerings.map((offering) => [offering.id, offering]));
  const contactsByOrg = new Map<string, DemoClientContact[]>();
  for (const contact of input.clientContacts) {
    const list = contactsByOrg.get(contact.orgId) ?? [];
    list.push(contact);
    contactsByOrg.set(contact.orgId, list);
  }

  const custodyByOrg = new Map<string, DemoPet[]>();
  for (const pet of input.custodyPets) {
    if (!pet.custodianOrgId) continue;
    const list = custodyByOrg.get(pet.custodianOrgId) ?? [];
    list.push(pet);
    custodyByOrg.set(pet.custodianOrgId, list);
  }

  const rows: Prisma.AppointmentCreateManyInput[] = [];
  let index = 0;

  // The provider's side of every consumer booking. This is what turns a tutor's
  // action in `app` into a line on somebody's agenda in `plus`, and it is also
  // what makes an animal a PATIENT of a clinic that never had custody of it.
  for (const booking of input.bookings) {
    const offering = offeringById.get(booking.offeringId)!;

    rows.push({
      id: id("apt", (index += 1)),
      orgId: booking.orgId,
      bookingId: booking.id,
      petId: booking.petId,
      tutorId: booking.tutorId,
      serviceOfferingId: booking.offeringId,
      serviceLabel: offering.title,
      scheduledAt: booking.startsAt,
      durationMinutes: offering.durationMinutes,
      status: BOOKING_TO_APPOINTMENT[booking.status],
      notes: null,
    });
  }

  // Walk-ins: a client with no account, booked over the counter.
  for (let n = 0; n < WALK_IN_COUNT; n += 1) {
    const org = input.orgs[n % input.orgs.length]!;
    const contacts = contactsByOrg.get(org.id);
    if (!contacts || contacts.length === 0) continue;

    const daysFromNow = rng.int(-120, 45);
    const scheduledAt = atTime(daysFrom(now, daysFromNow), rng.int(8, 18), rng.pick([0, 30]));

    rows.push({
      id: id("apt", (index += 1)),
      orgId: org.id,
      clientContactId: rng.pick(contacts).id,
      serviceLabel: rng.pick(WALK_IN_SERVICES),
      scheduledAt,
      durationMinutes: rng.pick([20, 30, 45, 60, 90]),
      status:
        daysFromNow < 0
          ? rng.weighted([
              ["COMPLETED", 8],
              ["CANCELLED", 1],
              ["NO_SHOW", 1],
            ] as const)
          : rng.weighted([
              ["CONFIRMED", 5],
              ["PENDING", 2],
            ] as const),
      notes: rng.pick(APPOINTMENT_NOTES),
    });
  }

  // Today, for every organization.
  //
  // The `plus` dashboard prefetches `appointment.list({ period: "today" })` and
  // counts `appointmentsToday` in its first tile. Both are driven by rows dated
  // on the calendar day the page is opened, so leaving them to a random spread
  // over ten months means the panel is empty on all but a few days of the year —
  // which is exactly how the previous seed behaved.
  const today = startOfDay(now);

  // Status is fixed per slot rather than derived from the clock. Deriving it
  // was the obvious thing and it was wrong: seeding at nine in the evening put
  // every slot in the past, marked all three COMPLETED, and left the tile —
  // which counts only PENDING and CONFIRMED — reading zero. A booking that has
  // happened but has not been closed out is PENDING, which is exactly what an
  // agenda looks like at the end of a day anyway.
  const TODAY_SLOTS = [
    { hour: 9, status: "COMPLETED" as const },
    { hour: 14, status: "CONFIRMED" as const },
    { hour: 17, status: "PENDING" as const },
  ];

  for (const org of input.orgs) {
    const contacts = contactsByOrg.get(org.id) ?? [];
    const custody = custodyByOrg.get(org.id) ?? [];

    for (let n = 0; n < TODAY_PER_ORG; n += 1) {
      const slot = TODAY_SLOTS[n % TODAY_SLOTS.length]!;
      const useContact = contacts.length > 0 && (n % 2 === 0 || custody.length === 0);

      rows.push({
        id: id("apt", (index += 1)),
        orgId: org.id,
        clientContactId: useContact ? rng.pick(contacts).id : null,
        petId: useContact ? null : (custody[n % Math.max(1, custody.length)]?.id ?? null),
        serviceLabel: rng.pick(WALK_IN_SERVICES),
        scheduledAt: atTime(today, slot.hour, 0),
        durationMinutes: rng.pick([30, 45, 60]),
        status: slot.status,
        notes: null,
      });
    }
  }

  await insertMany(rows, (batch) =>
    db.appointment.createMany({ data: batch, skipDuplicates: true }),
  );
}

// --- Helpers ----------------------------------------------------------------

function statusFor(ctxRng: SeedContext["rng"], daysFromNow: number): DemoBooking["status"] {
  if (daysFromNow < -1) {
    return ctxRng.weighted([
      ["COMPLETED", 14],
      ["CANCELLED", 3],
      ["NO_SHOW", 1],
    ] as const);
  }

  if (daysFromNow <= 0) return "IN_PROGRESS";

  return ctxRng.weighted([
    ["CONFIRMED", 7],
    ["PENDING", 3],
  ] as const);
}

/**
 * `ANM-7QK4D2`.
 *
 * Derived from the row index in a 32-character alphabet rather than drawn, so
 * the unique constraint on `Booking.code` cannot be violated by an unlucky run.
 * The alphabet omits I, O, 0 and 1, since these end up read aloud.
 */
function codeFor(index: number): string {
  // Knuth's multiplicative constant is odd, so `index × k mod 32⁶` is a
  // bijection over the range this seed uses — different rows cannot collide,
  // while consecutive rows still look nothing like each other.
  let remainder = index * 2654435761;
  let code = "";

  for (let n = 0; n < 6; n += 1) {
    code += CODE_ALPHABET[remainder % CODE_ALPHABET.length];
    remainder = Math.floor(remainder / CODE_ALPHABET.length);
  }

  const candidate = `ANM-${code}`;

  // The five preserved codes are assigned by hand and are not in the sequence,
  // so a generated one landing on them would be silently dropped by
  // `skipDuplicates` rather than reported.
  return HERO_CODES.includes(candidate) ? `ANM-Z${code.slice(1)}` : candidate;
}
