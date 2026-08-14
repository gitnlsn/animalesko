import { z } from "zod";

/**
 * Favourites.
 *
 * Two separate procedures rather than one polymorphic `toggle({ kind, id })`,
 * mirroring the two tables in marketplace.prisma. The schema comment there
 * explains why the tables are split; the contract follows suit so a caller
 * cannot pass a listing id where an offering id belongs.
 */

export const favoriteListingSchema = z.object({ listingId: z.cuid() });
export const favoriteOfferingSchema = z.object({ offeringId: z.cuid() });

export type FavoriteListingInput = z.infer<typeof favoriteListingSchema>;
export type FavoriteOfferingInput = z.infer<typeof favoriteOfferingSchema>;

/** What a toggle reports back, so the UI can settle its optimistic state. */
export interface FavoriteToggleResult {
  favorited: boolean;
  pointsAwarded: number;
}
