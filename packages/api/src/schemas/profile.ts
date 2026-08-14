import { z } from "zod";

/**
 * The tutor's own profile.
 *
 * Replaces the prototype's `validateProfile()` — three hand-written regex
 * checks that ran in the browser and nowhere else, so the same form submitted
 * by anything but the UI was unvalidated. This schema backs both the form
 * resolver and the mutation.
 */

/** Brazilian landline or mobile, in the format the prototype's mask produced. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Use o formato (XX) XXXXX-XXXX");

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "O nome não pode estar vazio").max(80),
  phone: phoneSchema.optional().nullable().or(z.literal("")),
  bio: z.string().trim().max(500).optional().nullable(),
  street: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras")
    .optional()
    .nullable()
    .or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileFormValues = z.input<typeof updateProfileSchema>;

/**
 * E-mail is intentionally absent.
 *
 * The prototype let you edit it in the same dialog as your bio. It is the
 * credential Better Auth signs you in with, so changing it needs a
 * verification round-trip, not a text input beside "Cidade".
 */
