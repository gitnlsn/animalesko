import { z } from "zod";

/**
 * Booking a service.
 *
 * One contract for both prototype dialogs. `BookingDialog` collected a day, a
 * start time and a duration; `PetSitterBookingDialog` collected a date range.
 * Both are just ways of producing `startsAt` and `endsAt`, which is what
 * marketplace.prisma says the model is for — so the conversion happens in the
 * dialog and the API sees one shape.
 *
 * Note what is *not* here: a price. The client may preview a total with
 * `quotePriceCents`, but the server derives the stored amount from the
 * offering, so a tampered request cannot book a R$ 300 hotel stay for R$ 1.
 */

export const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Refuses a booking longer than this; catches an inverted or mistyped range. */
const MAX_BOOKING_DAYS = 90;

export const createBookingSchema = z
  .object({
    offeringId: z.cuid(),
    petId: z.cuid(),
    startsAt: z.date(),
    endsAt: z.date(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "O término deve ser depois do início.",
    path: ["endsAt"],
  })
  .refine(
    (value) => value.endsAt.getTime() - value.startsAt.getTime() <= MAX_BOOKING_DAYS * 86_400_000,
    { message: `Agendamento não pode passar de ${MAX_BOOKING_DAYS} dias.`, path: ["endsAt"] },
  );

export const listBookingsSchema = z.object({
  /** Omitted means every status — the "Todos" tab in the history screen. */
  status: bookingStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const bookingIdSchema = z.object({ id: z.cuid() });

export const cancelBookingSchema = z.object({
  id: z.cuid(),
  reason: z.string().trim().max(300).optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

const STATUS_LABELS_PT_BR: Record<BookingStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Realizado",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export function formatBookingStatus(status: BookingStatus): string {
  return STATUS_LABELS_PT_BR[status];
}

/** Statuses a tutor may still cancel from. */
export const CANCELLABLE_STATUSES: readonly BookingStatus[] = ["PENDING", "CONFIRMED"];
