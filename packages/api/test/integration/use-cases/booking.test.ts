import { describe } from "vitest";

import { CreateBookingUseCase } from "../../../src/use-cases/booking/create-booking.use-case.ts";
import {
  CancelBookingUseCase,
  ListBookingsUseCase,
} from "../../../src/use-cases/booking/booking.use-cases.ts";
import { InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

/**
 * A fixed sequence, so a test's booking code is reproducible and the retry loop
 * can be driven deliberately.
 */
function fixedRandomInt(): (max: number) => number {
  let cursor = 0;
  return (max: number) => cursor++ % max;
}

async function seedOffering(
  db: TestDb,
  overrides: { priceCents?: number; priceUnit?: "PER_DAY" | "PER_WALK"; isActive?: boolean } = {},
) {
  const { org } = await createProviderSession(db);

  const offering = await db.serviceOffering.create({
    data: {
      orgId: org.id,
      type: "DOG_WALKER",
      title: "Dog Walker",
      priceCents: overrides.priceCents ?? 2500,
      priceUnit: overrides.priceUnit ?? "PER_WALK",
      isActive: overrides.isActive ?? true,
    },
  });

  return { org, offering };
}

async function seedPet(db: TestDb, ownerId: string) {
  return db.pet.create({ data: { name: "Rex", species: "DOG", ownerId } });
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

describe.concurrent("CreateBookingUseCase", () => {
  test("derives the price from the offering rather than the client", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering, org } = await seedOffering(db, {
      priceCents: 4500,
      priceUnit: "PER_DAY",
    });

    const useCase = new CreateBookingUseCase({ db, randomInt: fixedRandomInt() });

    const booking = await useCase.execute({
      actorId: user.id,
      data: {
        offeringId: offering.id,
        petId: pet.id,
        startsAt: inDays(1),
        // Three days at R$ 45/dia.
        endsAt: inDays(4),
      },
    });

    expect(booking.priceCents).toBe(13_500);
    expect(booking.status).toBe("PENDING");
    expect(booking.code).toMatch(/^ANM-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(booking.org.id).toBe(org.id);
  });

  test("creates the provider's appointment in the same write", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering, org } = await seedOffering(db);

    const booking = await new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    // This is the seam to apps/plus: a booking with no agenda entry would be
    // invisible to the provider who has to perform it.
    const appointment = await db.appointment.findUnique({ where: { bookingId: booking.id } });

    expect(appointment).not.toBeNull();
    expect(appointment?.orgId).toBe(org.id);
    expect(appointment?.status).toBe("PENDING");
  });

  test("notifies the tutor", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db);

    await new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    const notifications = await db.notification.findMany({ where: { userId: user.id } });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("SERVICE");
    expect(notifications[0]?.href).toBe("/historico");
  });

  test("refuses a pet the actor does not own, indistinguishably from a missing one", async ({
    db,
    expect,
  }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const someoneElsesPet = await seedPet(db, stranger.id);
    const { offering } = await seedOffering(db);

    const useCase = new CreateBookingUseCase({ db, randomInt: fixedRandomInt() });

    await expect(
      useCase.execute({
        actorId: user.id,
        data: {
          offeringId: offering.id,
          petId: someoneElsesPet.id,
          startsAt: inDays(1),
          endsAt: inDays(1.1),
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("refuses an offering the provider has withdrawn", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db, { isActive: false });

    await expect(
      new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
        actorId: user.id,
        data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("refuses a start date in the past", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db);

    await expect(
      new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
        actorId: user.id,
        data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(-1), endsAt: inDays(1) },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe.concurrent("CancelBookingUseCase", () => {
  test("cancels the appointment alongside the booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db);

    const booking = await new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    const cancelled = await new CancelBookingUseCase({ db }).execute({
      actorId: user.id,
      id: booking.id,
      reason: "Mudança de planos.",
    });

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toBe("Mudança de planos.");

    // Leaving the agenda entry behind would show the provider a slot the tutor
    // believes is gone.
    const appointment = await db.appointment.findUnique({ where: { bookingId: booking.id } });
    expect(appointment?.status).toBe("CANCELLED");
  });

  test("refuses to cancel a completed service", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db);

    const booking = await new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    await db.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });

    await expect(
      new CancelBookingUseCase({ db }).execute({ actorId: user.id, id: booking.id }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  test("does not let one tutor cancel another's booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const { offering } = await seedOffering(db);

    const booking = await new CreateBookingUseCase({ db, randomInt: fixedRandomInt() }).execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    await expect(
      new CancelBookingUseCase({ db }).execute({ actorId: stranger.id, id: booking.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("ListBookingsUseCase", () => {
  test("returns only the caller's bookings, filtered by status", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const pet = await seedPet(db, user.id);
    const strangerPet = await seedPet(db, stranger.id);
    const { offering } = await seedOffering(db);

    const create = new CreateBookingUseCase({ db, randomInt: fixedRandomInt() });

    const mine = await create.execute({
      actorId: user.id,
      data: { offeringId: offering.id, petId: pet.id, startsAt: inDays(1), endsAt: inDays(1.1) },
    });

    await create.execute({
      actorId: stranger.id,
      data: {
        offeringId: offering.id,
        petId: strangerPet.id,
        startsAt: inDays(2),
        endsAt: inDays(2.1),
      },
    });

    const useCase = new ListBookingsUseCase({ db });

    const all = await useCase.execute({ actorId: user.id, limit: 50 });
    expect(all.map((booking) => booking.id)).toEqual([mine.id]);

    const cancelled = await useCase.execute({ actorId: user.id, status: "CANCELLED", limit: 50 });
    expect(cancelled).toHaveLength(0);
  });
});
