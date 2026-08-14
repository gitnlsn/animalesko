import type { Database, Prisma } from "@animalesko/db";

import type { ListNotificationsInput } from "../../schemas/notification.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface NotificationDeps {
  db: Pick<Database, "notification">;
}

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationDTO = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export type ListNotificationsCommand = ActorCommand & ListNotificationsInput;

export class ListNotificationsUseCase implements UseCase<
  ListNotificationsCommand,
  NotificationDTO[]
> {
  constructor(private readonly deps: NotificationDeps) {}

  execute({ actorId, onlyUnread, limit }: ListNotificationsCommand): Promise<NotificationDTO[]> {
    return this.deps.db.notification.findMany({
      where: { userId: actorId, ...(onlyUnread ? { readAt: null } : {}) },
      select: notificationSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export class CountUnreadNotificationsUseCase implements UseCase<ActorCommand, number> {
  constructor(private readonly deps: NotificationDeps) {}

  execute({ actorId }: ActorCommand): Promise<number> {
    return this.deps.db.notification.count({ where: { userId: actorId, readAt: null } });
  }
}

export interface MarkNotificationReadCommand extends ActorCommand {
  notificationId: string;
}

/**
 * Marking a notification read.
 *
 * `updateMany` rather than `update` on purpose: scoping by `userId` in the
 * where-clause means someone else's id updates zero rows instead of throwing a
 * distinguishable "not found", and there is nothing to report back either way.
 */
export class MarkNotificationReadUseCase implements UseCase<
  MarkNotificationReadCommand,
  { updated: number }
> {
  constructor(private readonly deps: NotificationDeps) {}

  async execute({ actorId, notificationId }: MarkNotificationReadCommand) {
    const result = await this.deps.db.notification.updateMany({
      where: { id: notificationId, userId: actorId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}

export class MarkAllNotificationsReadUseCase implements UseCase<ActorCommand, { updated: number }> {
  constructor(private readonly deps: NotificationDeps) {}

  async execute({ actorId }: ActorCommand) {
    const result = await this.deps.db.notification.updateMany({
      where: { userId: actorId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
