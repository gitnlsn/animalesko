import { registerPushDeviceSchema, unregisterPushDeviceSchema } from "../schemas/push.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Device registration for push notifications.
 *
 * Both procedures are `protectedProcedure`: a token is claimed *by* an account,
 * and the owner comes from the session rather than from client input, so one
 * device cannot register itself against somebody else's notifications.
 */
export const pushRouter = createTRPCRouter({
  register: protectedProcedure
    .input(registerPushDeviceSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.push.register.execute({ actorId: ctx.user.id, ...input }),
    ),

  unregister: protectedProcedure
    .input(unregisterPushDeviceSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.push.unregister.execute({ actorId: ctx.user.id, ...input }),
    ),
});
