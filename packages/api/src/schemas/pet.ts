import { z } from "zod";

import { pastDate } from "./date.ts";

/**
 * The one Pet contract.
 *
 * The prototypes had three incompatible versions of this shape and validated
 * with hand-written `validateForm()` functions that lived only in the browser.
 * These schemas are used by the tRPC router *and* by the forms, so client and
 * server can never disagree about what a valid pet is.
 */

export const speciesSchema = z.enum(["DOG", "CAT", "BIRD", "RODENT", "REPTILE", "FISH", "OTHER"]);

export const sexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);
export const petSizeSchema = z.enum(["SMALL", "MEDIUM", "LARGE"]);
export const healthStatusSchema = z.enum(["EXCELLENT", "GOOD", "ATTENTION", "URGENT"]);

/** Rough upper bound; catches a gram/kilogram mix-up without rejecting a mastiff. */
const MAX_WEIGHT_KG = 200;

const temperamentSchema = z.array(z.string().trim().min(1).max(30)).max(10);

/**
 * The fields themselves, carrying **no defaults**.
 *
 * Defaults are applied only by `createPetSchema` below. They must not leak into
 * the update schema: `.partial()` marks a field optional but still runs its
 * `.default()` when the key is absent, so a partial update built from a
 * defaulted schema silently rewrites every field the caller did not mention —
 * resetting `healthStatus` to GOOD and emptying `temperament` on a rename.
 */
export const petFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(60, "Nome muito longo"),
  species: speciesSchema,
  breed: z.string().trim().max(80).optional().nullable(),
  sex: sexSchema,
  size: petSizeSchema.optional().nullable(),
  birthDate: pastDate("Data de nascimento não pode estar no futuro").optional().nullable(),
  weightKg: z
    .number()
    .positive("Peso deve ser maior que 0")
    .max(MAX_WEIGHT_KG, "Peso acima do limite aceito")
    .optional()
    .nullable(),
  healthStatus: healthStatusSchema,
  photoUrl: z.url("URL inválida").optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  temperament: temperamentSchema,
  neutered: z.boolean(),
  microchip: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "Microchip deve ter 15 dígitos")
    .optional()
    .nullable(),
});

/** Creating a pet: the optional-with-a-sensible-default fields. */
export const createPetSchema = petFieldsSchema.extend({
  sex: sexSchema.default("UNKNOWN"),
  healthStatus: healthStatusSchema.default("GOOD"),
  temperament: temperamentSchema.default([]),
  neutered: z.boolean().default(false),
});

/** Editing a pet: strictly what the caller named, nothing else. */
export const updatePetDataSchema = petFieldsSchema.partial();

export const updatePetSchema = updatePetDataSchema.extend({
  id: z.cuid(),
});

export const petIdSchema = z.object({ id: z.cuid() });

export const listPetsSchema = z.object({
  includeDeceased: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.cuid().optional(),
});

export type Species = z.infer<typeof speciesSchema>;
export type Sex = z.infer<typeof sexSchema>;
export type PetSize = z.infer<typeof petSizeSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export type PetFields = z.infer<typeof petFieldsSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetData = z.infer<typeof updatePetDataSchema>;
/**
 * Pre-parse shape, i.e. what a form actually holds before defaults are applied.
 * Fields with `.default()` are optional here but required in CreatePetInput,
 * so react-hook-form needs this one as its field type.
 */
export type CreatePetFormValues = z.input<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type ListPetsInput = z.infer<typeof listPetsSchema>;

/**
 * Age was a stored string in both prototypes ("2 anos", age: 3), so it went
 * stale the moment it was written. It is derived here instead, and this is the
 * only place that formats it.
 */
export function ageInMonths(birthDate: Date | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;

  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth()) -
    (now.getDate() < birthDate.getDate() ? 1 : 0);

  return Math.max(0, months);
}

export function formatAgePtBR(birthDate: Date | null | undefined, now = new Date()): string {
  const months = ageInMonths(birthDate, now);
  if (months === null) return "Idade desconhecida";

  if (months < 1) return "Recém-nascido";
  if (months < 12) return months === 1 ? "1 mês" : `${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? "1 ano" : `${years} anos`;
}
