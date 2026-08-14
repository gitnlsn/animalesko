import { z } from "zod";

/**
 * Direct messages.
 *
 * A conversation is always *about* something — an organization, a listing or a
 * booking — which is what lets "Falar com o abrigo" open the right thread
 * instead of creating a new one on every click.
 */

export const listConversationsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(30),
});

export const conversationIdSchema = z.object({ conversationId: z.cuid() });

export const listMessagesSchema = z.object({
  conversationId: z.cuid(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.cuid(),
    body: z.string().trim().max(2000).optional().nullable(),
    imageUrl: z.url().optional().nullable(),
    /** The prototype's "enviar localização" button. */
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .refine((value) => Boolean(value.body || value.imageUrl || value.latitude !== null), {
    message: "Escreva algo, envie uma foto ou compartilhe sua localização.",
    path: ["body"],
  })
  .refine(
    (value) =>
      (value.latitude === null || value.latitude === undefined) ===
      (value.longitude === null || value.longitude === undefined),
    { message: "Latitude e longitude devem vir juntas.", path: ["longitude"] },
  );

/** Opens the thread with an organization, creating it on first contact. */
export const openConversationSchema = z.object({
  orgId: z.cuid(),
  listingId: z.cuid().optional().nullable(),
});

export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type OpenConversationInput = z.infer<typeof openConversationSchema>;
