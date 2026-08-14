import {
  alertIdSchema,
  createAlertSchema,
  listAlertsSchema,
  reportSightingSchema,
  resolveAlertSchema,
} from "../schemas/alert.ts";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc.ts";

/**
 * Pet Alert.
 *
 * Reading the board is public: a lost animal is found by whoever happens to
 * walk past it, and requiring an account first would defeat the feature.
 * Filing, resolving and reporting a sighting all need a signed-in actor.
 */
export const alertRouter = createTRPCRouter({
  list: publicProcedure
    .input(listAlertsSchema)
    .query(({ ctx, input }) => ctx.useCases.alert.list.execute(input)),

  byId: publicProcedure
    .input(alertIdSchema)
    .query(({ ctx, input }) => ctx.useCases.alert.get.execute(input)),

  create: protectedProcedure
    .input(createAlertSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.alert.create.execute({ actorId: ctx.user.id, data: input }),
    ),

  reportSighting: protectedProcedure
    .input(reportSightingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.alert.reportSighting.execute({ actorId: ctx.user.id, ...input }),
    ),

  resolve: protectedProcedure
    .input(resolveAlertSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.alert.resolve.execute({ actorId: ctx.user.id, ...input }),
    ),
});
