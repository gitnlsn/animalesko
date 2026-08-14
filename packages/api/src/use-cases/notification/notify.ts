import type { Database, NotificationType } from "@animalesko/db";

export type NotifyDb = Pick<Database, "notification">;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** In-app destination, e.g. "/historico". */
  href?: string | null;
}

/**
 * Raises one notification.
 *
 * Kept as a plain function rather than a use case because it is always a *step*
 * inside another action — confirming a booking, receiving a message — never a
 * request of its own. Takes the narrow `NotifyDb` slice so callers can pass a
 * transaction client and have the notification commit with the thing it
 * announces, or not at all.
 */
export async function notify(db: NotifyDb, input: NotifyInput): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
}
