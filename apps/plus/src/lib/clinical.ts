import type { HealthStatus, ReminderType, VaccinationStatus } from "@animalesko/api/schemas";

/**
 * Clinical vocabulary → badge, in one place.
 *
 * The prototype repeated four near-identical `getStatusColor` switches across
 * `PetCard`, `VaccineManager`, `AppointmentsList` and `AppointmentDetails`,
 * each with its own hardcoded Tailwind colours (`bg-green-100 text-green-800`).
 * These use the semantic tokens, so dark mode works without a second table.
 */

type BadgeVariant = "success" | "default" | "warning" | "destructive" | "muted";

export const HEALTH_BADGE: Record<HealthStatus, { label: string; variant: BadgeVariant }> = {
  EXCELLENT: { label: "Excelente", variant: "success" },
  GOOD: { label: "Bom", variant: "default" },
  ATTENTION: { label: "Atenção", variant: "warning" },
  URGENT: { label: "Urgente", variant: "destructive" },
};

export const VACCINATION_BADGE: Record<VaccinationStatus, BadgeVariant> = {
  EM_DIA: "success",
  PROXIMA: "warning",
  ATRASADA: "destructive",
  SEM_REFORCO: "muted",
};

export const REMINDER_ICON: Record<ReminderType, string> = {
  GENERAL: "📌",
  MEDICATION: "💊",
  APPOINTMENT: "🩺",
  GROOMING: "✂️",
  FEEDING: "🍽️",
  EXERCISE: "🎾",
};
