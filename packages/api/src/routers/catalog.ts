import {
  browseListingsSchema,
  browseOfferingsSchema,
  listingIdSchema,
} from "../schemas/catalog.ts";
import { createTRPCRouter, publicProcedure } from "../trpc.ts";

/**
 * Read-only browse surface for apps/app: what the supply side published in
 * apps/plus. Public on purpose — the adoption feed is the app's SEO front door
 * and must render without a session.
 */
export const catalogRouter = createTRPCRouter({
  offerings: publicProcedure
    .input(browseOfferingsSchema)
    .query(({ ctx, input }) => ctx.useCases.catalog.offerings.execute(input)),

  listings: publicProcedure
    .input(browseListingsSchema)
    .query(({ ctx, input }) => ctx.useCases.catalog.listings.execute(input)),

  /** One listing plus the shelter's other available animals. */
  listingById: publicProcedure
    .input(listingIdSchema)
    .query(({ ctx, input }) => ctx.useCases.catalog.listing.execute(input)),

  /** Today's featured animal — the same one for everybody. */
  petOfTheDay: publicProcedure.query(({ ctx }) => ctx.useCases.catalog.petOfTheDay.execute()),

  /** Real counts behind the home screen's stat cards. */
  stats: publicProcedure.query(({ ctx }) => ctx.useCases.catalog.stats.execute()),
});
