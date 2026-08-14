import { z } from "zod";

/**
 * In-app notifications.
 *
 * The prototype's `Notification` carried `action: () => void` — a closure that
 * flipped a tab. That cannot be stored, sent over the wire or delivered to a
 * second device, which is why every notification here carries an `href`
 * instead.
 */

export const notificationTypeSchema = z.enum([
  "SERVICE",
  "ADOPTION",
  "REMINDER",
  "MESSAGE",
  "ALERT",
  "SYSTEM",
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const listNotificationsSchema = z.object({
  onlyUnread: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(20),
});

export const notificationIdSchema = z.object({ id: z.cuid() });

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
