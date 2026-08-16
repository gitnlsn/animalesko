import { db as rootDb } from "@animalesko/db";

import { sendPush } from "../push/send-push.ts";
import { afterCommit } from "../transaction.ts";

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

  /**
   * The same notification, pushed to the user's devices.
   *
   * Deferred rather than awaited here for two reasons. The row above is written
   * inside the caller's transaction, so sending now would announce a booking
   * that may still roll back; and Firebase is a network call that would hold a
   * database connection open for the length of it, once per recipient.
   *
   * `rootDb` and not `db`: `db` is the transaction client, which is closed by
   * the time this runs.
   */
  afterCommit(() =>
    sendPush(rootDb, {
      userId: input.userId,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    }),
  );
}
