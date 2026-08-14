import { z } from "zod";

/**
 * Money is integer cents everywhere. The prototypes carried prices as display
 * strings ("R$ 45/dia", "R$ 25/passeio"), which made them unsortable,
 * unsummable and impossible to charge against.
 */

export const priceUnitSchema = z.enum([
  "PER_HOUR",
  "PER_DAY",
  "PER_NIGHT",
  "PER_WALK",
  "PER_SESSION",
]);

export type PriceUnit = z.infer<typeof priceUnitSchema>;

export const priceCentsSchema = z.number().int("Valor deve ser inteiro em centavos").nonnegative();

const UNIT_LABELS_PT_BR: Record<PriceUnit, string> = {
  PER_HOUR: "hora",
  PER_DAY: "dia",
  PER_NIGHT: "noite",
  PER_WALK: "passeio",
  PER_SESSION: "sessão",
};

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** "R$ 45,00/dia" — the display string the prototypes stored, now derived. */
export function formatPrice(cents: number, unit: PriceUnit): string {
  return `${formatBRL(cents)}/${UNIT_LABELS_PT_BR[unit]}`;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * How many billable units a booking spans.
 *
 * Exported so the booking dialogs can show a running total that is the same
 * arithmetic the server will charge. The server still recomputes — the client's
 * number is a preview, never an input — but "one definition" means the preview
 * cannot quietly promise a different price from the one that gets stored.
 *
 * Rounds up: half a day of daycare is a day. `PER_WALK` and `PER_SESSION` are
 * flat, so a longer window does not multiply them.
 */
export function billableUnits(unit: PriceUnit, startsAt: Date, endsAt: Date): number {
  const ms = Math.max(0, endsAt.getTime() - startsAt.getTime());

  switch (unit) {
    case "PER_HOUR":
      return Math.max(1, Math.ceil(ms / MS_PER_HOUR));
    case "PER_DAY":
    case "PER_NIGHT":
      return Math.max(1, Math.ceil(ms / MS_PER_DAY));
    case "PER_WALK":
    case "PER_SESSION":
      return 1;
  }
}

/** The total for a booking, in integer cents. */
export function quotePriceCents(
  unitPriceCents: number,
  unit: PriceUnit,
  startsAt: Date,
  endsAt: Date,
): number {
  return unitPriceCents * billableUnits(unit, startsAt, endsAt);
}
