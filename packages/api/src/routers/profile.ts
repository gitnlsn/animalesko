import { updateProfileSchema } from "../schemas/profile.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

export const profileRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.profile.get.execute({ actorId: ctx.user.id }),
  ),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.profile.update.execute({ actorId: ctx.user.id, data: input }),
    ),
});
