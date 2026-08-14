import { favoriteListingSchema, favoriteOfferingSchema } from "../schemas/favorite.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Favourites. The prototype kept these in `localStorage["favoritePets"]`, so
 * they were per-device and vanished with the cache.
 */
export const favoriteRouter = createTRPCRouter({
  listings: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.favorite.listings.execute({ actorId: ctx.user.id }),
  ),

  offerings: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.favorite.offerings.execute({ actorId: ctx.user.id }),
  ),

  /** Just the ids, so a whole grid can render its hearts from one request. */
  ids: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.favorite.ids.execute({ actorId: ctx.user.id }),
  ),

  toggleListing: protectedProcedure
    .input(favoriteListingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.favorite.toggleListing.execute({ actorId: ctx.user.id, ...input }),
    ),

  toggleOffering: protectedProcedure
    .input(favoriteOfferingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.favorite.toggleOffering.execute({ actorId: ctx.user.id, ...input }),
    ),
});
