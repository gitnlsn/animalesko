import { describe } from "vitest";

import { ConflictError, InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  CreateReviewUseCase,
  ListReviewableBookingsUseCase,
} from "../../../src/use-cases/review/review.use-cases.ts";
import { POINTS } from "../../../src/schemas/gamification.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

async function seedCompletedBooking(
  db: TestDb,
  tutorId: string,
  options: { status?: "COMPLETED" | "PENDING"; code?: string } = {},
) {
  const { org } = await createProviderSession(db);

  const offering = await db.serviceOffering.create({
    data: {
      orgId: org.id,
      type: "DOG_WALKER",
      title: "Dog Walker",
      priceCents: 2500,
      priceUnit: "PER_WALK",
    },
  });

  const pet = await db.pet.create({ data: { name: "Rex", species: "DOG", ownerId: tutorId } });

  const booking = await db.booking.create({
    data: {
      code: options.code ?? `ANM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      status: options.status ?? "COMPLETED",
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() - 82_800_000),
      priceCents: 2500,
      tutorId,
      petId: pet.id,
      offeringId: offering.id,
      orgId: org.id,
    },
  });

  return { org, booking };
}

describe.concurrent("CreateReviewUseCase", () => {
  test("stores the review and rolls the organization's rating forward", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { org, booking } = await seedCompletedBooking(db, user.id);

    const review = await new CreateReviewUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, rating: 4, comment: "Pontual e atencioso." },
    });

    expect(review.rating).toBe(4);

    // providers.prisma declares these columns are kept current by the review
    // path; a stale average is what the denormalisation exists to avoid.
    const updated = await db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(updated.ratingAvg).toBe(4);
    expect(updated.ratingCount).toBe(1);
  });

  test("averages across several reviews of the same organization", async ({ db, expect }) => {
    const { user: first } = await createUserSession(db);
    const { user: second } = await createUserSession(db);
    const { org, booking } = await seedCompletedBooking(db, first.id);

    const otherPet = await db.pet.create({
      data: { name: "Mimi", species: "CAT", ownerId: second.id },
    });

    const secondBooking = await db.booking.create({
      data: {
        code: `ANM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        status: "COMPLETED",
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() - 82_800_000),
        priceCents: 2500,
        tutorId: second.id,
        petId: otherPet.id,
        offeringId: booking.offeringId,
        orgId: org.id,
      },
    });

    const useCase = new CreateReviewUseCase({ db });
    await useCase.execute({ actorId: first.id, data: { bookingId: booking.id, rating: 5 } });
    await useCase.execute({ actorId: second.id, data: { bookingId: secondBooking.id, rating: 3 } });

    const updated = await db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(updated.ratingAvg).toBe(4);
    expect(updated.ratingCount).toBe(2);
  });

  test("allows only one review per booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedCompletedBooking(db, user.id);
    const useCase = new CreateReviewUseCase({ db });

    await useCase.execute({ actorId: user.id, data: { bookingId: booking.id, rating: 5 } });

    await expect(
      useCase.execute({ actorId: user.id, data: { bookingId: booking.id, rating: 1 } }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("refuses to review a service that has not happened", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedCompletedBooking(db, user.id, { status: "PENDING" });

    await expect(
      new CreateReviewUseCase({ db }).execute({
        actorId: user.id,
        data: { bookingId: booking.id, rating: 5 },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  test("refuses to review somebody else's booking", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const { booking } = await seedCompletedBooking(db, user.id);

    await expect(
      new CreateReviewUseCase({ db }).execute({
        actorId: stranger.id,
        data: { bookingId: booking.id, rating: 5 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("awards the reviewer their points", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedCompletedBooking(db, user.id);

    await new CreateReviewUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, rating: 5 },
    });

    const profile = await db.gamificationProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profile.points).toBe(POINTS.REVIEW_CREATED);
  });
});

describe.concurrent("ListReviewableBookingsUseCase", () => {
  test("lists completed bookings until they are reviewed", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { booking } = await seedCompletedBooking(db, user.id);
    const useCase = new ListReviewableBookingsUseCase({ db });

    const before = await useCase.execute({ actorId: user.id });
    expect(before.map((row) => row.id)).toEqual([booking.id]);

    await new CreateReviewUseCase({ db }).execute({
      actorId: user.id,
      data: { bookingId: booking.id, rating: 5 },
    });

    const after = await useCase.execute({ actorId: user.id });
    expect(after).toHaveLength(0);
  });
});
