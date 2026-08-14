import { z } from "zod";

/**
 * Reviews of a provider.
 *
 * Anchored to a booking rather than free-floating, which is what makes them
 * verifiable: you can only review a service you actually received, and the
 * `@@unique` on `Review.bookingId` caps it at one review per booking.
 */

export const createReviewSchema = z.object({
  bookingId: z.cuid(),
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas").max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const listReviewsByOrgSchema = z.object({
  orgId: z.cuid(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsByOrgInput = z.infer<typeof listReviewsByOrgSchema>;
