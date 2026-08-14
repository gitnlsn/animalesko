import { describe } from "vitest";

import { NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  ListConversationsUseCase,
  ListMessagesUseCase,
  MarkConversationReadUseCase,
  OpenConversationUseCase,
  SendMessageUseCase,
} from "../../../src/use-cases/message/message.use-cases.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

async function seedThread(db: TestDb) {
  const { user: tutor } = await createUserSession(db);
  const { user: staff, org } = await createProviderSession(db);

  const conversation = await db.conversation.create({
    data: {
      orgId: org.id,
      participants: { create: [{ userId: tutor.id }, { userId: staff.id }] },
    },
  });

  return { tutor, staff, org, conversation };
}

describe.concurrent("SendMessageUseCase", () => {
  test("stores the message, bumps the thread and notifies the other side", async ({
    db,
    expect,
  }) => {
    const { tutor, staff, conversation } = await seedThread(db);

    const message = await new SendMessageUseCase({ db }).execute({
      actorId: tutor.id,
      conversationId: conversation.id,
      body: "Olá! O Thor se dá bem com crianças?",
    });

    expect(message.sender.id).toBe(tutor.id);

    const updated = await db.conversation.findUniqueOrThrow({ where: { id: conversation.id } });
    expect(updated.lastMessageAt.getTime()).toBe(message.createdAt.getTime());

    const theirs = await db.notification.findMany({ where: { userId: staff.id } });
    expect(theirs).toHaveLength(1);
    expect(theirs[0]?.type).toBe("MESSAGE");

    // You are not notified about your own message.
    const mine = await db.notification.count({ where: { userId: tutor.id } });
    expect(mine).toBe(0);
  });

  test("marks the thread read for the sender", async ({ db, expect }) => {
    const { tutor, conversation } = await seedThread(db);

    await new SendMessageUseCase({ db }).execute({
      actorId: tutor.id,
      conversationId: conversation.id,
      body: "Bom dia!",
    });

    const participant = await db.conversationParticipant.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId: conversation.id, userId: tutor.id } },
    });

    expect(participant.lastReadAt).not.toBeNull();
  });

  test("refuses a thread the caller is not part of", async ({ db, expect }) => {
    const { conversation } = await seedThread(db);
    const { user: outsider } = await createUserSession(db);

    // Indistinguishable from a conversation id that was never issued, so the
    // error cannot be used to probe which threads exist.
    await expect(
      new SendMessageUseCase({ db }).execute({
        actorId: outsider.id,
        conversationId: conversation.id,
        body: "Deixa eu ver isso",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("ListMessagesUseCase", () => {
  test("returns the thread oldest-first and refuses outsiders", async ({ db, expect }) => {
    const { tutor, staff, conversation } = await seedThread(db);
    const send = new SendMessageUseCase({ db });

    await send.execute({ actorId: tutor.id, conversationId: conversation.id, body: "primeira" });
    await send.execute({ actorId: staff.id, conversationId: conversation.id, body: "segunda" });
    await send.execute({ actorId: tutor.id, conversationId: conversation.id, body: "terceira" });

    const thread = await new ListMessagesUseCase({ db }).execute({
      actorId: tutor.id,
      conversationId: conversation.id,
      limit: 50,
    });

    expect(thread.map((message) => message.body)).toEqual(["primeira", "segunda", "terceira"]);

    const { user: outsider } = await createUserSession(db);
    await expect(
      new ListMessagesUseCase({ db }).execute({
        actorId: outsider.id,
        conversationId: conversation.id,
        limit: 50,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("keeps the latest page when the thread exceeds the limit", async ({ db, expect }) => {
    const { tutor, conversation } = await seedThread(db);
    const send = new SendMessageUseCase({ db });

    for (let index = 1; index <= 5; index += 1) {
      await send.execute({
        actorId: tutor.id,
        conversationId: conversation.id,
        body: `mensagem ${index}`,
      });
    }

    const thread = await new ListMessagesUseCase({ db }).execute({
      actorId: tutor.id,
      conversationId: conversation.id,
      limit: 2,
    });

    expect(thread.map((message) => message.body)).toEqual(["mensagem 4", "mensagem 5"]);
  });
});

describe.concurrent("ListConversationsUseCase", () => {
  test("counts only messages received since the caller last read", async ({ db, expect }) => {
    const { tutor, staff, conversation } = await seedThread(db);
    const send = new SendMessageUseCase({ db });

    await send.execute({ actorId: staff.id, conversationId: conversation.id, body: "oi" });
    await send.execute({ actorId: staff.id, conversationId: conversation.id, body: "tudo bem?" });

    const list = new ListConversationsUseCase({ db });

    const before = await list.execute({ actorId: tutor.id, limit: 30 });
    expect(before).toHaveLength(1);
    expect(before[0]?.unreadCount).toBe(2);
    expect(before[0]?.lastMessage?.body).toBe("tudo bem?");

    await new MarkConversationReadUseCase({ db }).execute({
      actorId: tutor.id,
      conversationId: conversation.id,
    });

    const after = await list.execute({ actorId: tutor.id, limit: 30 });
    expect(after[0]?.unreadCount).toBe(0);
  });

  test("returns nothing for someone with no threads", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    const list = await new ListConversationsUseCase({ db }).execute({
      actorId: user.id,
      limit: 30,
    });

    expect(list).toEqual([]);
  });
});

describe.concurrent("OpenConversationUseCase", () => {
  test("is idempotent per organization and listing", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { org } = await createProviderSession(db);
    const useCase = new OpenConversationUseCase({ db });

    const first = await useCase.execute({ actorId: user.id, orgId: org.id });
    const second = await useCase.execute({ actorId: user.id, orgId: org.id });

    // Tapping "Falar com o abrigo" twice must not split the history in two.
    expect(second.conversationId).toBe(first.conversationId);
  });

  test("rejects an organization that does not exist", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    await expect(
      new OpenConversationUseCase({ db }).execute({
        actorId: user.id,
        orgId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
