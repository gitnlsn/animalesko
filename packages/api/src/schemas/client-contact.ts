import { z } from "zod";

/**
 * A walk-in client of an organization.
 *
 * `AppointmentForm` collected `clientName` and `phone` as loose strings on
 * every appointment, so the same person booking twice produced two unrelated
 * records and no history. This is the row those two fields really wanted to be;
 * `@@unique([orgId, phone])` is what makes the dedupe possible.
 */

export const clientContactFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Use o formato (XX) XXXXX-XXXX"),
  email: z.email("E-mail inválido").optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createClientContactSchema = clientContactFieldsSchema;

export const updateClientContactSchema = clientContactFieldsSchema.partial().extend({
  id: z.cuid(),
});

export const clientContactIdSchema = z.object({ id: z.cuid() });

export const listClientContactsSchema = z.object({
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export type ClientContactFields = z.infer<typeof clientContactFieldsSchema>;
export type CreateClientContactInput = z.infer<typeof createClientContactSchema>;
export type CreateClientContactFormValues = z.input<typeof createClientContactSchema>;
export type UpdateClientContactInput = z.infer<typeof updateClientContactSchema>;
export type ListClientContactsInput = z.infer<typeof listClientContactsSchema>;
