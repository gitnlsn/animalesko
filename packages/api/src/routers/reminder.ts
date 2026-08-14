import { createReminderSchema, listRemindersSchema, recordIdSchema } from "../schemas/clinical.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Reminders belong to a person, not an organization — so this is
 * `protectedProcedure`, and both apps mount it unchanged.
 */
export const reminderRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listRemindersSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.reminder.list.execute({ actorId: ctx.user.id, ...input }),
    ),

  create: protectedProcedure
    .input(createReminderSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.reminder.create.execute({ actorId: ctx.user.id, data: input }),
    ),

  /** Toggles, so an accidental tick can be undone. */
  complete: protectedProcedure
    .input(recordIdSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.reminder.complete.execute({ actorId: ctx.user.id, reminderId: input.id }),
    ),

  delete: protectedProcedure
    .input(recordIdSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.reminder.delete.execute({ actorId: ctx.user.id, reminderId: input.id }),
    ),
});
