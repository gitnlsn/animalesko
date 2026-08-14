import { listNotificationsSchema, notificationIdSchema } from "../schemas/notification.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listNotificationsSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.notification.list.execute({ actorId: ctx.user.id, ...input }),
    ),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.notification.unreadCount.execute({ actorId: ctx.user.id }),
  ),

  markRead: protectedProcedure.input(notificationIdSchema).mutation(({ ctx, input }) =>
    ctx.useCases.notification.markRead.execute({
      actorId: ctx.user.id,
      notificationId: input.id,
    }),
  ),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.useCases.notification.markAllRead.execute({ actorId: ctx.user.id }),
  ),
});
