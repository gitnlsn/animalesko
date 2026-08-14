import { z } from "zod";

/**
 * The provider's agenda.
 *
 * The prototype's `Appointment` carried `clientName` + `phone` as loose strings
 * on every row, so the same client appearing twice was two unrelated records
 * with no way to see their history. Here a walk-in is a `ClientContact` and the
 * appointment points at it; an appointment created from a consumer booking
 * points at the tutor's `User` instead.
 */

export const appointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/**
 * The service list the prototype hardcoded in `AppointmentForm`. Kept as
 * suggestions for the free-text label rather than an enum: an appointment can
 * be for something the organization has never published as an offering, and
 * `Appointment.serviceLabel` is a string for exactly that reason.
 */
export const SERVICE_SUGGESTIONS = [
  "Consulta Veterinária",
  "Vacinação",
  "Banho e Tosa",
  "Tosa Higiênica",
  "Exame de Sangue",
  "Castração",
  "Cirurgia",
  "Consulta de Retorno",
  "Limpeza Dental",
  "Aplicação de Medicamento",
  "Microchipagem",
  "Exame Radiológico",
  "Ultrassom",
  "Emergência",
] as const;

export const createAppointmentSchema = z
  .object({
    serviceLabel: z.string().trim().min(1, "Informe o serviço").max(80),
    scheduledAt: z.date(),
    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(60 * 12)
      .default(60),
    notes: z.string().trim().max(1000).optional().nullable(),
    petId: z.cuid().optional().nullable(),
    /** An existing walk-in client. */
    clientContactId: z.cuid().optional().nullable(),
    /**
     * A new walk-in, created alongside the appointment. Mutually exclusive with
     * `clientContactId` — the form offers "pick a client" or "add a new one",
     * and sending both would leave it ambiguous which one the appointment is
     * for.
     */
    newClient: z
      .object({
        name: z.string().trim().min(1, "Nome do cliente é obrigatório").max(80),
        phone: z
          .string()
          .trim()
          .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Use o formato (XX) XXXXX-XXXX"),
        email: z.email("E-mail inválido").optional().nullable().or(z.literal("")),
      })
      .optional()
      .nullable(),
  })
  .refine((value) => !(value.clientContactId && value.newClient), {
    message: "Escolha um cliente existente ou cadastre um novo, não os dois.",
    path: ["clientContactId"],
  })
  .refine((value) => Boolean(value.clientContactId || value.newClient), {
    message: "Informe o cliente do agendamento.",
    path: ["newClient"],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateAppointmentFormValues = z.input<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  id: z.cuid(),
  serviceLabel: z.string().trim().min(1).max(80).optional(),
  scheduledAt: z.date().optional(),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(60 * 12)
    .optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const setAppointmentStatusSchema = z.object({
  id: z.cuid(),
  status: appointmentStatusSchema,
});

export const appointmentIdSchema = z.object({ id: z.cuid() });

/** The prototype's "Todos os períodos / Hoje / Esta semana / Este mês". */
export const appointmentPeriodSchema = z.enum(["all", "today", "week", "month", "upcoming"]);

export type AppointmentPeriod = z.infer<typeof appointmentPeriodSchema>;

export const listAppointmentsSchema = z.object({
  status: appointmentStatusSchema.optional(),
  period: appointmentPeriodSchema.default("all"),
  /** Matches client name, pet name or service label. */
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export type ListAppointmentsInput = z.infer<typeof listAppointmentsSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type SetAppointmentStatusInput = z.infer<typeof setAppointmentStatusSchema>;

/**
 * Search params for `/agenda`, parsed leniently.
 *
 * `.catch(undefined)` per field so a hand-edited URL degrades to the unfiltered
 * agenda instead of 400-ing the page — the same treatment
 * `listingSearchParamsSchema` gets in the consumer app.
 */
export const agendaSearchParamsSchema = z.object({
  status: appointmentStatusSchema.catch(undefined as never).optional(),
  period: appointmentPeriodSchema.catch("all" as never).default("all"),
  q: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .catch(undefined as never)
    .optional(),
});

const STATUS_LABELS_PT_BR: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Realizado",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export function formatAppointmentStatus(status: AppointmentStatus): string {
  return STATUS_LABELS_PT_BR[status];
}

/**
 * Which statuses an appointment may move to.
 *
 * The prototype offered every status from every status, so a cancelled
 * appointment could be marked "realizado" and a completed one could be
 * un-completed. Terminal states are terminal here.
 */
export const STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}
