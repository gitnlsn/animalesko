import { listLedgerSchema } from "../schemas/gamification.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Read-only on purpose.
 *
 * There is no `addPoints` procedure and there must not be one: points are
 * awarded by the use case for the action that earns them. The prototype
 * exposed `addPoints(n, reason)` to any component, which made the score
 * meaningless.
 */
export const gamificationRouter = createTRPCRouter({
  profile: protectedProcedure
    .input(listLedgerSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.gamification.profile.execute({ actorId: ctx.user.id, ...input }),
    ),
});
