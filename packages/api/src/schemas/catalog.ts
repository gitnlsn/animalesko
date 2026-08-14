import { z } from "zod";

import { serviceTypeSchema } from "./offering.ts";
import { petSizeSchema, sexSchema, speciesSchema } from "./pet.ts";

/**
 * Filters for the public browse surface in apps/app. Lifted out of
 * routers/catalog.ts; reuses the enums already defined for pets and offerings
 * rather than restating them.
 */

export const browseOfferingsSchema = z.object({
  type: serviceTypeSchema.optional(),
  city: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const browseListingsSchema = z.object({
  species: speciesSchema.optional(),
  size: petSizeSchema.optional(),
  sex: sexSchema.optional(),
  state: z.string().length(2).optional(),
  /**
   * Free-text search over name, breed and summary. Capped so a pathological
   * query cannot turn into an expensive `ILIKE '%…%'` scan.
   */
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const listingIdSchema = z.object({ id: z.cuid() });

export type BrowseOfferingsInput = z.infer<typeof browseOfferingsSchema>;
export type BrowseListingsInput = z.infer<typeof browseListingsSchema>;
export type ListingIdInput = z.infer<typeof listingIdSchema>;

/**
 * The `?species=&size=&sex=&q=` shape the adoption page keeps in its URL.
 *
 * Separate from `browseListingsSchema` because search params arrive as strings
 * and an unrecognised value must degrade to "no filter" rather than 400 the
 * page — someone editing the URL by hand should get the unfiltered feed, not an
 * error screen.
 */
export const listingSearchParamsSchema = z.object({
  species: speciesSchema.catch(undefined as never).optional(),
  size: petSizeSchema.catch(undefined as never).optional(),
  sex: sexSchema.catch(undefined as never).optional(),
  q: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .catch(undefined as never)
    .optional(),
});

export type ListingSearchParams = z.infer<typeof listingSearchParamsSchema>;
