import { z } from "zod";

/**
 * Adoption listings, from the shelter's side.
 *
 * The prototype had no such screen — which is why, until now, the consumer
 * app's entire adoption feed could only be populated by `pnpm db:seed`. This is
 * the supply side of `catalog.listings`.
 */

export const adoptionStatusSchema = z.enum([
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "ADOPTED",
  "ARCHIVED",
]);

export const adoptionUrgencySchema = z.enum(["URGENT", "PUPPY", "READY"]);

export type AdoptionStatus = z.infer<typeof adoptionStatusSchema>;
export type AdoptionUrgency = z.infer<typeof adoptionUrgencySchema>;

export const createListingSchema = z.object({
  petId: z.cuid(),
  summary: z.string().trim().min(1, "Escreva um resumo").max(300),
  story: z.string().trim().max(4000).optional().nullable(),
  urgency: adoptionUrgencySchema.default("READY"),
  city: z.string().trim().min(1, "Informe a cidade").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras"),
  photoUrls: z.array(z.url()).max(8).default([]),
});

export const updateListingSchema = z.object({
  id: z.cuid(),
  summary: z.string().trim().min(1).max(300).optional(),
  story: z.string().trim().max(4000).optional().nullable(),
  urgency: adoptionUrgencySchema.optional(),
  city: z.string().trim().min(1).max(80).optional(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  photoUrls: z.array(z.url()).max(8).optional(),
});

/** Named apart from catalog's `listingIdSchema`, which is the public one. */
export const providerListingIdSchema = z.object({ id: z.cuid() });

export const setListingStatusSchema = z.object({
  id: z.cuid(),
  status: adoptionStatusSchema,
  /**
   * Required when moving to ADOPTED: the animal has to go *to* somebody, and
   * that transfer is the adoption. Must be an applicant on this listing.
   */
  adopterApplicationId: z.cuid().optional().nullable(),
});

export const listListingsSchema = z.object({
  status: adoptionStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const applicationStatusSchema = z.enum([
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const decideApplicationSchema = z.object({
  applicationId: z.cuid(),
  status: z.enum(["IN_REVIEW", "APPROVED", "REJECTED"]),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type CreateListingFormValues = z.input<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type SetListingStatusInput = z.infer<typeof setListingStatusSchema>;
export type ListListingsInput = z.infer<typeof listListingsSchema>;
export type DecideApplicationInput = z.infer<typeof decideApplicationSchema>;

const STATUS_LABELS_PT_BR: Record<AdoptionStatus, string> = {
  DRAFT: "Rascunho",
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  ADOPTED: "Adotado",
  ARCHIVED: "Arquivado",
};

export function formatAdoptionStatus(status: AdoptionStatus): string {
  return STATUS_LABELS_PT_BR[status];
}

const URGENCY_LABELS_PT_BR: Record<AdoptionUrgency, string> = {
  URGENT: "Urgente",
  PUPPY: "Filhote",
  READY: "Pronto para adoção",
};

export function formatAdoptionUrgency(urgency: AdoptionUrgency): string {
  return URGENCY_LABELS_PT_BR[urgency];
}

const APPLICATION_LABELS_PT_BR: Record<ApplicationStatus, string> = {
  SUBMITTED: "Recebida",
  IN_REVIEW: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  WITHDRAWN: "Retirada",
};

export function formatApplicationStatus(status: ApplicationStatus): string {
  return APPLICATION_LABELS_PT_BR[status];
}

/**
 * The listing lifecycle.
 *
 * Publishing is a state machine, not an `isPublished` boolean, because the
 * steps mean different things: RESERVED holds an animal for someone mid-process
 * and takes it off the feed without ending the story, while ADOPTED is
 * terminal and transfers ownership. ARCHIVED is the way out for a listing that
 * should never have existed.
 */
export const LISTING_TRANSITIONS: Record<AdoptionStatus, readonly AdoptionStatus[]> = {
  DRAFT: ["AVAILABLE", "ARCHIVED"],
  AVAILABLE: ["RESERVED", "ADOPTED", "DRAFT", "ARCHIVED"],
  RESERVED: ["ADOPTED", "AVAILABLE", "ARCHIVED"],
  ADOPTED: [],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionListing(from: AdoptionStatus, to: AdoptionStatus): boolean {
  return LISTING_TRANSITIONS[from].includes(to);
}
