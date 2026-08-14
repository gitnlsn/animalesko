import {
  createListingSchema,
  decideApplicationSchema,
  listListingsSchema,
  providerListingIdSchema,
  setListingStatusSchema,
  updateListingSchema,
} from "../schemas/listing.ts";
import { adminProcedure, createTRPCRouter, providerProcedure } from "../trpc.ts";
import { z } from "zod";

/**
 * Adoption listings, provider side — the supply behind the consumer app's
 * adoption feed. Until this existed, only `pnpm db:seed` could put a pet there.
 */
export const listingRouter = createTRPCRouter({
  list: providerProcedure
    .input(listListingsSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.listing.list.execute({ organizationId: ctx.organization.id, ...input }),
    ),

  byId: providerProcedure.input(providerListingIdSchema).query(({ ctx, input }) =>
    ctx.useCases.listing.get.execute({
      organizationId: ctx.organization.id,
      listingId: input.id,
    }),
  ),

  create: providerProcedure
    .input(createListingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.listing.create.execute({ organizationId: ctx.organization.id, data: input }),
    ),

  update: providerProcedure
    .input(updateListingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.listing.update.execute({ organizationId: ctx.organization.id, ...input }),
    ),

  /**
   * Admin-only: publishing and, above all, ADOPTED — which transfers the animal
   * to its new owner. Not something a STAFF account should be able to do.
   */
  setStatus: adminProcedure
    .input(setListingStatusSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.listing.setStatus.execute({ organizationId: ctx.organization.id, ...input }),
    ),

  applications: providerProcedure
    .input(z.object({ listingId: z.cuid().optional() }))
    .query(({ ctx, input }) =>
      ctx.useCases.listing.applications.execute({
        organizationId: ctx.organization.id,
        listingId: input.listingId,
      }),
    ),

  decide: providerProcedure
    .input(decideApplicationSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.listing.decide.execute({ organizationId: ctx.organization.id, ...input }),
    ),
});
