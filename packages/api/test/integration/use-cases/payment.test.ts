import { describe } from "vitest";

import { ConflictError, InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  GetBookingPaymentUseCase,
  PayBookingUseCase,
} from "../../../src/use-cases/payment/payment.use-cases.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

async function seedBooking(db: TestDb, tutorId: string, priceCents = 4500) {
  const { org } = await createProviderSession(db);

  const offering = await db.serviceOffering.create({
    data: {
      orgId: org.id,
      type: "PET_SITTER",
      title: "Pet Sitter",
      priceCents,
      priceUnit: "PER_DAY",
    },
  });

  const pet = await db.pet.create({ data: { name: "Mimi", species: "CAT", ownerId: tutorId } });

  const booking = await db.booking.create({
    data: {
      code: `ANM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      status: "PENDING",
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 172_800_000),
      priceCents,
      tutorId,
      petId: pet.id,
      offeringId: offering.id,
      orgId: org.id,
      appointment: {
        create: {
          orgId: org.id,
          petId: pet.id,
          tutorId,
          serviceOfferingId: offering.id,
          serviceLabel: "Pet Sitter",
          scheduledAt: new Date(Date.now() + 86_400_000),
        },
      },
    },
  });

  return { org, booking };
}

describe.concurrent("PayBookingUseCase", () => {
  test("takes the amount from the booking and confirms it", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id, 9000);

    const payment = await new PayBookingUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, method: "PIX" },
    });

    expect(payment.amountCents).toBe(9000);
    expect(payment.status).toBe("PAID");
    expect(payment.paidAt).not.toBeNull();
    expect(payment.pixPayload).toContain(booking.code);

    // A paid service that still reads "Pendente" is the split state this
    // avoids — the agenda entry moves with it.
    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("CONFIRMED");

    const appointment = await db.appointment.findUnique({ where: { bookingId: booking.id } });
    expect(appointment?.status).toBe("CONFIRMED");
  });

  test("leaves cash pending for the provider to settle", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);

    const payment = await new PayBookingUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, method: "CASH" },
    });

    expect(payment.status).toBe("PENDING");
    expect(payment.paidAt).toBeNull();

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("PENDING");
  });

  test("refuses to charge twice", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);
    const useCase = new PayBookingUseCase({ db });

    await useCase.execute({ actorId: user.id, data: { bookingId: booking.id, method: "PIX" } });

    await expect(
      useCase.execute({ actorId: user.id, data: { bookingId: booking.id, method: "PIX" } }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("lets an unpaid booking switch method", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);
    const useCase = new PayBookingUseCase({ db });

    await useCase.execute({ actorId: user.id, data: { bookingId: booking.id, method: "CASH" } });
    const second = await useCase.execute({
      actorId: user.id,
      data: { bookingId: booking.id, method: "CREDIT_CARD" },
    });

    expect(second.method).toBe("CREDIT_CARD");
    expect(second.status).toBe("PAID");

    const rows = await db.payment.count({ where: { bookingId: booking.id } });
    expect(rows).toBe(1);
  });

  test("refuses a cancelled booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);

    await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    await expect(
      new PayBookingUseCase({ db }).execute({
        actorId: user.id,
        data: { bookingId: booking.id, method: "PIX" },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  test("refuses somebody else's booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);

    await expect(
      new PayBookingUseCase({ db }).execute({
        actorId: stranger.id,
        data: { bookingId: booking.id, method: "PIX" },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("GetBookingPaymentUseCase", () => {
  test("is scoped through the booking's tutor", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const { booking } = await seedBooking(db, user.id);

    await new PayBookingUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, method: "PIX" },
    });

    const useCase = new GetBookingPaymentUseCase({ db });

    expect(await useCase.execute({ actorId: user.id, bookingId: booking.id })).not.toBeNull();
    expect(await useCase.execute({ actorId: stranger.id, bookingId: booking.id })).toBeNull();
  });
});
