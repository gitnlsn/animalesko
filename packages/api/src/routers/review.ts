import { createReviewSchema, listReviewsByOrgSchema } from "../schemas/review.ts";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc.ts";

export const reviewRouter = createTRPCRouter({
  /** A provider's reviews are public — they are what a tutor reads before booking. */
  byOrg: publicProcedure
    .input(listReviewsByOrgSchema)
    .query(({ ctx, input }) => ctx.useCases.review.byOrg.execute(input)),

  mine: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.review.mine.execute({ actorId: ctx.user.id }),
  ),

  /** Completed services the caller has not reviewed yet. */
  pending: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.review.pending.execute({ actorId: ctx.user.id }),
  ),

  create: protectedProcedure
    .input(createReviewSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.review.create.execute({ actorId: ctx.user.id, data: input }),
    ),
});
