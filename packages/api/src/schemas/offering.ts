import { z } from "zod";

import { priceCentsSchema, priceUnitSchema } from "./money.ts";

/**
 * What a provider sells. Lifted out of routers/offering.ts so the router, the
 * use cases and the `plus` form all validate against one definition.
 */

export const serviceTypeSchema = z.enum([
  "PET_SITTER",
  "DOG_WALKER",
  "DAYCARE",
  "HOTEL",
  "GROOMING",
  "VET_CONSULT",
  "VACCINATION",
  "TRAINING",
  "TRANSPORT",
  "OTHER",
]);

export const offeringInputSchema = z.object({
  type: serviceTypeSchema,
  title: z.string().trim().min(1, "Título é obrigatório").max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  priceCents: priceCentsSchema,
  priceUnit: priceUnitSchema,
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(60 * 24 * 30)
    .optional()
    .nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  imageUrl: z.url().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const createOfferingSchema = offeringInputSchema;

export const updateOfferingSchema = offeringInputSchema.partial().extend({
  id: z.cuid(),
});

export const offeringIdSchema = z.object({ id: z.cuid() });

export type ServiceType = z.infer<typeof serviceTypeSchema>;
export type OfferingInput = z.infer<typeof offeringInputSchema>;
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
/** Pre-parse shape, for react-hook-form: `tags` and `isActive` have defaults. */
export type CreateOfferingFormValues = z.input<typeof createOfferingSchema>;
