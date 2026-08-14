import { sendMessageSchema } from "../../schemas/message.ts";
import { NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { parseCommandData } from "../validate.ts";
import { withTransaction } from "../transaction.ts";

import type { Database, Prisma } from "@animalesko/db";

import type {
  ListConversationsInput,
  ListMessagesInput,
  OpenConversationInput,
  SendMessageInput,
} from "../../schemas/message.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface MessageDeps {
  db: Pick<
    Database,
    "conversation" | "conversationParticipant" | "message" | "organization" | "notification"
  >;
}

const conversationSelect = {
  id: true,
  lastMessageAt: true,
  org: { select: { id: true, slug: true, name: true, avatarUrl: true } },
  listing: { select: { id: true, pet: { select: { name: true } } } },
  booking: { select: { id: true, code: true } },
  messages: {
    select: { id: true, body: true, imageUrl: true, createdAt: true, senderId: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ConversationSelect;

type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof conversationSelect }>;

export type ConversationSummaryDTO = Omit<ConversationRow, "messages"> & {
  lastMessage: ConversationRow["messages"][number] | null;
  unreadCount: number;
};

const messageSelect = {
  id: true,
  body: true,
  imageUrl: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  sender: { select: { id: true, name: true, image: true } },
} satisfies Prisma.MessageSelect;

export type MessageDTO = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

export type ListConversationsCommand = ActorCommand & ListConversationsInput;

/**
 * The caller's threads, newest activity first.
 *
 * Unread counts come from one `groupBy` rather than a count per row: the
 * prototype's list was two hardcoded objects, but a real inbox of thirty
 * threads would otherwise be thirty extra queries.
 */
export class ListConversationsUseCase implements UseCase<
  ListConversationsCommand,
  ConversationSummaryDTO[]
> {
  constructor(private readonly deps: MessageDeps) {}

  async execute({ actorId, limit }: ListConversationsCommand): Promise<ConversationSummaryDTO[]> {
    const participations = await this.deps.db.conversationParticipant.findMany({
      where: { userId: actorId },
      select: {
        lastReadAt: true,
        conversation: { select: conversationSelect },
      },
      orderBy: { conversation: { lastMessageAt: "desc" } },
      take: limit,
    });

    if (participations.length === 0) return [];

    const readCutoffById = new Map(
      participations.map((row) => [row.conversation.id, row.lastReadAt]),
    );

    const unreadGroups = await this.deps.db.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: [...readCutoffById.keys()] },
        // Your own messages are never unread.
        senderId: { not: actorId },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    // groupBy cannot apply a *per-group* cutoff, so the counts above are totals.
    // Fetch only the ids whose newest message is past that thread's cutoff, and
    // count those precisely — usually a handful of threads, not all of them.
    const staleIds = unreadGroups
      .filter((group) => {
        const cutoff = readCutoffById.get(group.conversationId);
        return !cutoff || (group._max.createdAt ?? new Date(0)) > cutoff;
      })
      .map((group) => group.conversationId);

    const unreadById = new Map<string, number>();

    await Promise.all(
      staleIds.map(async (conversationId) => {
        const cutoff = readCutoffById.get(conversationId);
        const count = await this.deps.db.message.count({
          where: {
            conversationId,
            senderId: { not: actorId },
            ...(cutoff ? { createdAt: { gt: cutoff } } : {}),
          },
        });
        unreadById.set(conversationId, count);
      }),
    );

    return participations.map(({ conversation }) => {
      const { messages, ...rest } = conversation;

      return {
        ...rest,
        lastMessage: messages[0] ?? null,
        unreadCount: unreadById.get(conversation.id) ?? 0,
      };
    });
  }
}

export type ListMessagesCommand = ActorCommand & ListMessagesInput;

export class ListMessagesUseCase implements UseCase<ListMessagesCommand, MessageDTO[]> {
  constructor(private readonly deps: MessageDeps) {}

  async execute({ actorId, conversationId, limit }: ListMessagesCommand): Promise<MessageDTO[]> {
    await assertParticipant(this.deps.db, { actorId, conversationId });

    const messages = await this.deps.db.message.findMany({
      where: { conversationId },
      select: messageSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetched newest-first so `take` keeps the *latest* page, returned
    // oldest-first because that is the order a chat renders in.
    return messages.reverse();
  }
}

export type SendMessageCommand = ActorCommand & SendMessageInput;

export class SendMessageUseCase implements UseCase<SendMessageCommand, MessageDTO> {
  constructor(private readonly deps: MessageDeps) {}

  async execute(command: SendMessageCommand): Promise<MessageDTO> {
    const { actorId } = command;
    const data = parseCommandData(sendMessageSchema, {
      conversationId: command.conversationId,
      body: command.body,
      imageUrl: command.imageUrl,
      latitude: command.latitude,
      longitude: command.longitude,
    });

    await assertParticipant(this.deps.db, { actorId, conversationId: data.conversationId });

    const others = await this.deps.db.conversationParticipant.findMany({
      where: { conversationId: data.conversationId, userId: { not: actorId } },
      select: { userId: true },
    });

    return withTransaction(this.deps.db, async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: actorId,
          body: data.body ?? null,
          imageUrl: data.imageUrl ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
        },
        select: messageSelect,
      });

      // Denormalised so the inbox can sort without joining the message table.
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      // Sending also marks the thread read for the sender — they have plainly
      // seen everything above their own message.
      await tx.conversationParticipant.updateMany({
        where: { conversationId: data.conversationId, userId: actorId },
        data: { lastReadAt: message.createdAt },
      });

      for (const participant of others) {
        await notify(tx, {
          userId: participant.userId,
          type: "MESSAGE",
          title: `Nova mensagem de ${message.sender.name}`,
          body: data.body ?? "Enviou um anexo.",
          href: `/mensagens?conversa=${data.conversationId}`,
        });
      }

      return message;
    });
  }
}

export interface MarkConversationReadCommand extends ActorCommand {
  conversationId: string;
}

export class MarkConversationReadUseCase implements UseCase<
  MarkConversationReadCommand,
  { updated: number }
> {
  constructor(private readonly deps: MessageDeps) {}

  async execute({ actorId, conversationId }: MarkConversationReadCommand) {
    const result = await this.deps.db.conversationParticipant.updateMany({
      where: { conversationId, userId: actorId },
      data: { lastReadAt: new Date() },
    });

    return { updated: result.count };
  }
}

export type OpenConversationCommand = ActorCommand & OpenConversationInput;

/**
 * Finds or creates the caller's thread with an organization.
 *
 * Idempotent by (org, listing, caller): tapping "Falar com o abrigo" twice
 * lands in the same thread rather than splitting the history in two.
 */
export class OpenConversationUseCase implements UseCase<
  OpenConversationCommand,
  { conversationId: string }
> {
  constructor(private readonly deps: MessageDeps) {}

  async execute({ actorId, orgId, listingId }: OpenConversationCommand) {
    const org = await this.deps.db.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!org) {
      throw new NotFoundError("Prestador não encontrado.");
    }

    const existing = await this.deps.db.conversation.findFirst({
      where: {
        orgId,
        listingId: listingId ?? null,
        participants: { some: { userId: actorId } },
      },
      select: { id: true },
    });

    if (existing) return { conversationId: existing.id };

    const created = await this.deps.db.conversation.create({
      data: {
        orgId,
        listingId: listingId ?? null,
        participants: { create: [{ userId: actorId }] },
      },
      select: { id: true },
    });

    return { conversationId: created.id };
  }
}

/**
 * Membership check, phrased as a not-found.
 *
 * A thread the caller is not in must be indistinguishable from one that does
 * not exist, or the error becomes a way to probe which conversation ids are
 * real.
 */
async function assertParticipant(
  db: Pick<Database, "conversationParticipant">,
  params: { actorId: string; conversationId: string },
): Promise<void> {
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: params.conversationId,
        userId: params.actorId,
      },
    },
    select: { id: true },
  });

  if (!participant) {
    throw new NotFoundError("Conversa não encontrada.");
  }
}
