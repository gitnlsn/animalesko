import { z } from "zod";

/**
 * Paying for a booking.
 *
 * There is no gateway behind this yet — the prototype's Payment screen was a
 * `setTimeout` and a toast. What is real is the `Payment` row: the amount comes
 * from the booking, the status transitions are enforced, and swapping in a
 * provider later means filling `gatewayRef` and moving the PAID transition
 * behind a webhook, not rewriting the screen.
 */

export const paymentMethodSchema = z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"]);
export const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const payBookingSchema = z.object({
  bookingId: z.cuid(),
  method: paymentMethodSchema,
});

export const bookingPaymentSchema = z.object({ bookingId: z.cuid() });

export type PayBookingInput = z.infer<typeof payBookingSchema>;

const METHOD_LABELS_PT_BR: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
};

export function formatPaymentMethod(method: PaymentMethod): string {
  return METHOD_LABELS_PT_BR[method];
}

const STATUS_LABELS_PT_BR: Record<PaymentStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

export function formatPaymentStatus(status: PaymentStatus): string {
  return STATUS_LABELS_PT_BR[status];
}

/**
 * Methods that settle the moment the tutor confirms.
 *
 * Cash is handed to the provider in person, so it stays PENDING until they
 * mark it received in `plus`. PIX would really wait on a webhook; until there
 * is a gateway it settles immediately, which is noted at the call site.
 */
export const INSTANT_METHODS: readonly PaymentMethod[] = ["PIX", "CREDIT_CARD", "DEBIT_CARD"];
