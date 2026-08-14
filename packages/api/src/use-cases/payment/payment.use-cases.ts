import { INSTANT_METHODS, payBookingSchema } from "../../schemas/payment.ts";
import { formatBRL } from "../../schemas/money.ts";
import { ConflictError, InvalidInputError, NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { parseCommandData } from "../validate.ts";
import { withTransaction } from "../transaction.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { PayBookingInput, PaymentMethod } from "../../schemas/payment.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface PaymentDeps {
  db: Pick<Database, "payment" | "booking" | "appointment" | "notification">;
}

const paymentSelect = {
  id: true,
  amountCents: true,
  currency: true,
  method: true,
  status: true,
  pixPayload: true,
  paidAt: true,
  createdAt: true,
  booking: {
    select: {
      id: true,
      code: true,
      startsAt: true,
      offering: { select: { title: true } },
      org: { select: { id: true, name: true } },
      pet: { select: { name: true } },
    },
  },
} satisfies Prisma.PaymentSelect;

export type PaymentDTO = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

export interface GetBookingPaymentCommand extends ActorCommand {
  bookingId: string;
}

export class GetBookingPaymentUseCase implements UseCase<
  GetBookingPaymentCommand,
  PaymentDTO | null
> {
  constructor(private readonly deps: PaymentDeps) {}

  execute({ actorId, bookingId }: GetBookingPaymentCommand): Promise<PaymentDTO | null> {
    return this.deps.db.payment.findFirst({
      // Scoped through the booking, so a payment id belonging to someone else
      // simply is not found.
      where: { bookingId, booking: { tutorId: actorId } },
      select: paymentSelect,
    });
  }
}

export interface PayBookingCommand extends ActorCommand {
  data: PayBookingInput;
}

/**
 * Records payment for a booking.
 *
 * The amount is read from the booking, never accepted from the client. Confirms
 * the booking as a side effect: a paid service that still reads "Pendente" is
 * the sort of split state the prototype produced by keeping the two in separate
 * component trees.
 */
export class PayBookingUseCase implements UseCase<PayBookingCommand, PaymentDTO> {
  constructor(private readonly deps: PaymentDeps) {}

  async execute(command: PayBookingCommand): Promise<PaymentDTO> {
    const { actorId } = command;
    const data = parseCommandData(payBookingSchema, command.data);

    const booking = await this.deps.db.booking.findFirst({
      where: { id: data.bookingId, tutorId: actorId },
      select: {
        id: true,
        code: true,
        status: true,
        priceCents: true,
        payment: { select: { id: true, status: true } },
      },
    });

    if (!booking) {
      throw new NotFoundError("Agendamento não encontrado.");
    }

    if (booking.status === "CANCELLED") {
      throw new InvalidInputError("Este agendamento foi cancelado.");
    }

    if (booking.payment?.status === "PAID") {
      throw new ConflictError("Este agendamento já foi pago.");
    }

    // PIX would really settle on a gateway webhook; with no gateway wired up
    // the three electronic methods settle here and cash stays pending until
    // the provider marks it received.
    const settles = INSTANT_METHODS.includes(data.method as PaymentMethod);
    const now = new Date();

    return withTransaction(this.deps.db, async (tx) => {
      const payment = await tx.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          amountCents: booking.priceCents,
          method: data.method,
          status: settles ? "PAID" : "PENDING",
          paidAt: settles ? now : null,
          pixPayload: data.method === "PIX" ? buildPixPayload(booking.code) : null,
        },
        update: {
          amountCents: booking.priceCents,
          method: data.method,
          status: settles ? "PAID" : "PENDING",
          paidAt: settles ? now : null,
          pixPayload: data.method === "PIX" ? buildPixPayload(booking.code) : null,
        },
        select: paymentSelect,
      });

      if (settles && booking.status === "PENDING") {
        await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
        await tx.appointment.updateMany({
          where: { bookingId: booking.id },
          data: { status: "CONFIRMED" },
        });
      }

      await notify(tx, {
        userId: actorId,
        type: "SERVICE",
        title: settles ? "Pagamento confirmado ✅" : "Pagamento registrado",
        body: settles
          ? `${formatBRL(payment.amountCents)} — ${payment.booking.offering.title}.`
          : `Pague ${formatBRL(payment.amountCents)} diretamente ao prestador.`,
        href: "/historico",
      });

      return payment;
    });
  }
}

/**
 * Placeholder "copia e cola" string.
 *
 * Not a valid BR Code — a real one is an EMV/BR Code payload signed with the
 * receiving PSP's key, which only a gateway can produce. Kept so the screen has
 * something to render and the column has an obvious shape to fill in later.
 */
function buildPixPayload(bookingCode: string): string {
  return `ANIMALESKO-PIX-${bookingCode}`;
}
