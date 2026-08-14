import type { Prisma } from "@animalesko/db";

/**
 * What the service-history screen renders per row: the booking, which pet it
 * was for, which service, and who provides it.
 */
export const bookingSelect = {
  id: true,
  code: true,
  status: true,
  startsAt: true,
  endsAt: true,
  priceCents: true,
  currency: true,
  notes: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  pet: { select: { id: true, name: true, species: true, photoUrl: true } },
  offering: { select: { id: true, type: true, title: true, priceUnit: true } },
  org: { select: { id: true, slug: true, name: true, phone: true, avatarUrl: true } },
  payment: { select: { id: true, status: true, method: true, amountCents: true, paidAt: true } },
  review: { select: { id: true, rating: true } },
} satisfies Prisma.BookingSelect;

export type BookingDTO = Prisma.BookingGetPayload<{ select: typeof bookingSelect }>;

/**
 * A quotable reference like "ANM-7QK4D2".
 *
 * Crockford's alphabet minus the ambiguous glyphs, so a code read over the
 * phone cannot be transcribed as a different valid code. 32^6 ≈ 10^9 keeps
 * collisions rare, and `Booking.code` is unique so a collision retries rather
 * than corrupts.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateBookingCode(randomInt: (max: number) => number): string {
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return `ANM-${suffix}`;
}
