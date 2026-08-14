import { z } from "zod";

import { pastDate } from "./date.ts";
import { speciesSchema } from "./pet.ts";

/**
 * Pet Alert — the lost-and-found board.
 *
 * The prototype wrote the entire registry to `localStorage["lostPets"]`, which
 * meant nobody but the reporter could ever see an alert. That is the whole
 * point of the feature, so this is the one screen where moving to the server
 * changes what the product *does*, not just where its data lives.
 */

export const lostPetStatusSchema = z.enum(["LOST", "FOUND", "RESOLVED"]);

export type LostPetStatus = z.infer<typeof lostPetStatusSchema>;

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

export const createAlertSchema = z.object({
  /** Set when the reporter picks one of their registered pets. */
  petId: z.cuid().optional().nullable(),
  name: z.string().trim().min(1, "Nome é obrigatório").max(60),
  species: speciesSchema,
  breed: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().min(1, "Descreva o pet").max(1000),
  lastSeenLat: latitudeSchema,
  lastSeenLng: longitudeSchema,
  lastSeenAddress: z.string().trim().min(1, "Informe onde foi visto").max(200),
  lastSeenAt: pastDate("A data não pode estar no futuro"),
  contactName: z.string().trim().min(1, "Nome para contato é obrigatório").max(80),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Use o formato (XX) XXXXX-XXXX"),
  photoUrls: z.array(z.url()).max(6).default([]),
});

/**
 * A bounding box, not a radius.
 *
 * Postgres without PostGIS cannot index a great-circle distance, but it can
 * index `lastSeenLat`/`lastSeenLng` — and community.prisma already declares
 * that composite index. The box is computed from a radius on the caller's side
 * of this contract so the query stays index-backed.
 */
export const listAlertsSchema = z.object({
  status: lostPetStatusSchema.optional(),
  species: speciesSchema.optional(),
  near: z
    .object({
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      radiusKm: z.number().min(1).max(500).default(50),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const alertIdSchema = z.object({ id: z.cuid() });

export const reportSightingSchema = z.object({
  alertId: z.cuid(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  address: z.string().trim().max(200).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  sightedAt: pastDate("A data não pode estar no futuro"),
});

export const resolveAlertSchema = z.object({
  id: z.cuid(),
  status: z.enum(["FOUND", "RESOLVED"]),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type CreateAlertFormValues = z.input<typeof createAlertSchema>;
export type ListAlertsInput = z.infer<typeof listAlertsSchema>;
export type ReportSightingInput = z.infer<typeof reportSightingSchema>;
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;

const STATUS_LABELS_PT_BR: Record<LostPetStatus, string> = {
  LOST: "Perdido",
  FOUND: "Encontrado",
  RESOLVED: "Resolvido",
};

export function formatAlertStatus(status: LostPetStatus): string {
  return STATUS_LABELS_PT_BR[status];
}
