import { createReviewSchema } from "../../schemas/review.ts";
import { BADGE_CODES, BADGE_THRESHOLDS, POINTS } from "../../schemas/gamification.ts";
import { ConflictError, InvalidInputError, NotFoundError } from "../errors.ts";
import { awardBadge } from "../gamification/award-badge.ts";
import { awardPoints } from "../gamification/award-points.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";
import { withTransaction } from "../transaction.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { CreateReviewInput, ListReviewsByOrgInput } from "../../schemas/review.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface ReviewDeps {
  db: Pick<
    Database,
    | "review"
    | "booking"
    | "organization"
    | "gamificationProfile"
    | "pointsLedgerEntry"
    | "badge"
    | "userBadge"
  >;
}

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  author: { select: { id: true, name: true, image: true } },
  org: { select: { id: true, slug: true, name: true } },
  booking: { select: { id: true, code: true, offering: { select: { title: true } } } },
} satisfies Prisma.ReviewSelect;

export type ReviewDTO = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

export class ListReviewsByOrgUseCase implements UseCase<ListReviewsByOrgInput, ReviewDTO[]> {
  constructor(private readonly deps: ReviewDeps) {}

  execute({ orgId, limit }: ListReviewsByOrgInput): Promise<ReviewDTO[]> {
    return this.deps.db.review.findMany({
      where: { orgId },
      select: reviewSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export class ListMyReviewsUseCase implements UseCase<ActorCommand, ReviewDTO[]> {
  constructor(private readonly deps: ReviewDeps) {}

  execute({ actorId }: ActorCommand): Promise<ReviewDTO[]> {
    return this.deps.db.review.findMany({
      where: { authorId: actorId },
      select: reviewSelect,
      orderBy: { createdAt: "desc" },
    });
  }
}

/** A completed booking of the caller's that has no review yet. */
export interface ReviewableBooking {
  id: string;
  code: string;
  endsAt: Date;
  offeringTitle: string;
  orgId: string;
  orgName: string;
  petName: string;
}

export class ListReviewableBookingsUseCase implements UseCase<ActorCommand, ReviewableBooking[]> {
  constructor(private readonly deps: ReviewDeps) {}

  async execute({ actorId }: ActorCommand): Promise<ReviewableBooking[]> {
    const bookings = await this.deps.db.booking.findMany({
      where: { tutorId: actorId, status: "COMPLETED", review: { is: null } },
      select: {
        id: true,
        code: true,
        endsAt: true,
        offering: { select: { title: true } },
        org: { select: { id: true, name: true } },
        pet: { select: { name: true } },
      },
      orderBy: { endsAt: "desc" },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      code: booking.code,
      endsAt: booking.endsAt,
      offeringTitle: booking.offering.title,
      orgId: booking.org.id,
      orgName: booking.org.name,
      petName: booking.pet.name,
    }));
  }
}

export interface CreateReviewCommand extends ActorCommand {
  data: CreateReviewInput;
}

/**
 * Writing a review.
 *
 * The organization's `ratingAvg` / `ratingCount` are denormalised columns —
 * providers.prisma says the review path keeps them current — so they are
 * recomputed inside the same transaction as the insert. Recomputed by
 * aggregate rather than by incrementing the running mean: a rolling average
 * accumulates float error, and this runs rarely enough that an AVG over one
 * organization's reviews costs nothing.
 */
export class CreateReviewUseCase implements UseCase<CreateReviewCommand, ReviewDTO> {
  constructor(private readonly deps: ReviewDeps) {}

  async execute(command: CreateReviewCommand): Promise<ReviewDTO> {
    const { actorId } = command;
    const data = parseCommandData(createReviewSchema, command.data);

    const booking = await this.deps.db.booking.findFirst({
      where: { id: data.bookingId, tutorId: actorId },
      select: { id: true, status: true, orgId: true },
    });

    if (!booking) {
      throw new NotFoundError("Agendamento não encontrado.");
    }

    if (booking.status !== "COMPLETED") {
      throw new InvalidInputError("Só é possível avaliar um serviço já realizado.");
    }

    let review: ReviewDTO;

    try {
      review = await withTransaction(this.deps.db, async (tx) => {
        const created = await tx.review.create({
          data: {
            rating: data.rating,
            comment: data.comment ?? null,
            authorId: actorId,
            orgId: booking.orgId,
            bookingId: booking.id,
          },
          select: reviewSelect,
        });

        const aggregate = await tx.review.aggregate({
          where: { orgId: booking.orgId },
          _avg: { rating: true },
          _count: { _all: true },
        });

        await tx.organization.update({
          where: { id: booking.orgId },
          data: {
            ratingAvg: aggregate._avg.rating ?? 0,
            ratingCount: aggregate._count._all,
          },
        });

        return created;
      });
    } catch (error) {
      if (isUniqueViolationOn(error, "bookingId")) {
        throw new ConflictError("Você já avaliou este serviço.", { cause: error });
      }
      throw error;
    }

    // Outside the transaction on purpose: points are a reward, and failing to
    // grant them must not roll back the review the user actually wrote.
    await awardPoints(this.deps.db, {
      userId: actorId,
      points: POINTS.REVIEW_CREATED,
      reason: "Avaliou um prestador! ⭐",
      source: `review:${review.id}`,
      once: true,
    });

    const reviewCount = await this.deps.db.review.count({ where: { authorId: actorId } });

    if (reviewCount >= BADGE_THRESHOLDS[BADGE_CODES.REVIEWER]) {
      await awardBadge(this.deps.db, { userId: actorId, code: BADGE_CODES.REVIEWER });
    }

    return review;
  }
}
