import { z } from "zod";

import { petFieldsSchema, speciesSchema } from "./pet.ts";

/**
 * The animals an organization is responsible for.
 *
 * Two relationships, one screen. A shelter *holds* an animal
 * (`Pet.custodianOrgId`); a clinic *attends* one it does not own (an
 * `Appointment` links them). The prototype had neither — its "Meus Pets" tab
 * listed the signed-in user's own two pets, which is the consumer app's job.
 */

export const animalRelationSchema = z.enum(["CUSTODY", "PATIENT"]);

export type AnimalRelation = z.infer<typeof animalRelationSchema>;

export const listAnimalsSchema = z.object({
  relation: animalRelationSchema.optional(),
  species: speciesSchema.optional(),
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

/**
 * Registering an animal the organization takes into custody.
 *
 * Reuses the consumer app's pet contract rather than restating it: a shelter
 * dog and a tutor's dog are the same shape, and `petFieldsSchema` is already
 * the one definition both the tRPC router and the form validate against.
 * `ownerId` is deliberately not expressible — a custody animal has no owner
 * until it is adopted, and that transition belongs to the listing state
 * machine.
 */
export const createAnimalSchema = petFieldsSchema.extend({
  sex: petFieldsSchema.shape.sex.default("UNKNOWN"),
  healthStatus: petFieldsSchema.shape.healthStatus.default("GOOD"),
  temperament: petFieldsSchema.shape.temperament.default([]),
  neutered: z.boolean().default(false),
});

export const updateAnimalSchema = petFieldsSchema.partial().extend({ id: z.cuid() });

export const animalIdSchema = z.object({ id: z.cuid() });

export type ListAnimalsInput = z.infer<typeof listAnimalsSchema>;
export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;
export type CreateAnimalFormValues = z.input<typeof createAnimalSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;

const RELATION_LABELS_PT_BR: Record<AnimalRelation, string> = {
  CUSTODY: "Sob nossa guarda",
  PATIENT: "Paciente",
};

export function formatAnimalRelation(relation: AnimalRelation): string {
  return RELATION_LABELS_PT_BR[relation];
}
