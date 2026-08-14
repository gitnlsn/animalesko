import {
  conversationIdSchema,
  listConversationsSchema,
  listMessagesSchema,
  openConversationSchema,
  sendMessageSchema,
} from "../schemas/message.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

export const messageRouter = createTRPCRouter({
  conversations: protectedProcedure
    .input(listConversationsSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.message.conversations.execute({ actorId: ctx.user.id, ...input }),
    ),

  thread: protectedProcedure
    .input(listMessagesSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.message.thread.execute({ actorId: ctx.user.id, ...input }),
    ),

  send: protectedProcedure
    .input(sendMessageSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.message.send.execute({ actorId: ctx.user.id, ...input }),
    ),

  markRead: protectedProcedure
    .input(conversationIdSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.message.markRead.execute({ actorId: ctx.user.id, ...input }),
    ),

  open: protectedProcedure
    .input(openConversationSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.message.open.execute({ actorId: ctx.user.id, ...input }),
    ),
});
