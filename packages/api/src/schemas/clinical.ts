import { z } from "zod";

import { pastDate } from "./date.ts";

/**
 * Clinical records: what a provider writes down about an animal.
 *
 * All three of the prototype's forms — `HealthRecordForm`, `VaccineManager`,
 * `ReminderForm` — ended in `console.log("...", formData)`. These are the
 * contracts behind them.
 */

// --- Health records ----------------------------------------------------------

/** Rough bounds; catches a gram/kilogram slip and a Fahrenheit reading. */
const MAX_WEIGHT_KG = 200;

export const createHealthRecordSchema = z.object({
  petId: z.cuid(),
  recordedAt: pastDate("A data não pode estar no futuro"),
  weightKg: z.number().positive().max(MAX_WEIGHT_KG).optional().nullable(),
  temperatureC: z
    .number()
    .min(30, "Temperatura fora do intervalo plausível")
    .max(45, "Temperatura fora do intervalo plausível")
    .optional()
    .nullable(),
  symptoms: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

/** `{ petId }`, distinct from pet.ts's `petIdSchema` which is `{ id }`. */
export const byPetSchema = z.object({ petId: z.cuid() });
export const recordIdSchema = z.object({ id: z.cuid() });

export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;
export type CreateHealthRecordFormValues = z.input<typeof createHealthRecordSchema>;

// --- Vaccinations ------------------------------------------------------------

/** The vaccine list the prototype hardcoded, kept as suggestions. */
export const VACCINE_SUGGESTIONS = [
  "Antirrábica",
  "V8",
  "V10",
  "V12",
  "Tríplice Felina",
  "Quíntupla Felina",
  "Giárdia",
  "Gripe Canina",
] as const;

export const createVaccinationSchema = z
  .object({
    petId: z.cuid(),
    name: z.string().trim().min(1, "Informe a vacina").max(60),
    appliedAt: pastDate("A aplicação não pode estar no futuro"),
    nextDoseAt: z.date().optional().nullable(),
    batch: z.string().trim().max(40).optional().nullable(),
    veterinarian: z.string().trim().max(80).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((value) => !value.nextDoseAt || value.nextDoseAt > value.appliedAt, {
    message: "A próxima dose deve ser depois da aplicação.",
    path: ["nextDoseAt"],
  });

export const updateVaccinationSchema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).max(60).optional(),
  appliedAt: z.date().optional(),
  nextDoseAt: z.date().optional().nullable(),
  batch: z.string().trim().max(40).optional().nullable(),
  veterinarian: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateVaccinationInput = z.infer<typeof createVaccinationSchema>;
export type CreateVaccinationFormValues = z.input<typeof createVaccinationSchema>;
export type UpdateVaccinationInput = z.infer<typeof updateVaccinationSchema>;

export const vaccinationStatusSchema = z.enum(["EM_DIA", "PROXIMA", "ATRASADA", "SEM_REFORCO"]);

export type VaccinationStatus = z.infer<typeof vaccinationStatusSchema>;

/** A booster inside this many days counts as "coming up". */
const DUE_SOON_DAYS = 30;

/**
 * Whether a dose is current, due soon, or overdue.
 *
 * Derived from `nextDoseAt`, never stored — `pets.prisma` says so, and the
 * prototype's stored `status: "up-to-date"` was already contradicted by its own
 * mock data (a V10 due 2024-08-20 sat there marked "overdue" while an entry
 * dated later was "up-to-date"). Computing it means it cannot go stale.
 */
export function vaccinationStatus(
  nextDoseAt: Date | null | undefined,
  now = new Date(),
): VaccinationStatus {
  if (!nextDoseAt) return "SEM_REFORCO";

  const days = Math.ceil((nextDoseAt.getTime() - now.getTime()) / 86_400_000);

  if (days < 0) return "ATRASADA";
  if (days <= DUE_SOON_DAYS) return "PROXIMA";

  return "EM_DIA";
}

const VACCINATION_STATUS_LABELS_PT_BR: Record<VaccinationStatus, string> = {
  EM_DIA: "Em dia",
  PROXIMA: "Próxima",
  ATRASADA: "Atrasada",
  SEM_REFORCO: "Dose única",
};

export function formatVaccinationStatus(status: VaccinationStatus): string {
  return VACCINATION_STATUS_LABELS_PT_BR[status];
}

// --- Reminders ---------------------------------------------------------------

export const reminderTypeSchema = z.enum([
  "GENERAL",
  "MEDICATION",
  "APPOINTMENT",
  "GROOMING",
  "FEEDING",
  "EXERCISE",
]);

export type ReminderType = z.infer<typeof reminderTypeSchema>;

export const createReminderSchema = z.object({
  type: reminderTypeSchema.default("GENERAL"),
  title: z.string().trim().min(1, "Informe o título").max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  dueAt: z.date(),
  petId: z.cuid().optional().nullable(),
});

export const listRemindersSchema = z.object({
  includeCompleted: z.boolean().default(false),
  petId: z.cuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type CreateReminderFormValues = z.input<typeof createReminderSchema>;
export type ListRemindersInput = z.infer<typeof listRemindersSchema>;

const REMINDER_TYPE_LABELS_PT_BR: Record<ReminderType, string> = {
  GENERAL: "Geral",
  MEDICATION: "Medicação",
  APPOINTMENT: "Consulta",
  GROOMING: "Banho e tosa",
  FEEDING: "Alimentação",
  EXERCISE: "Exercício",
};

export function formatReminderType(type: ReminderType): string {
  return REMINDER_TYPE_LABELS_PT_BR[type];
}
