import { CANCELLABLE_STATUSES } from "../../schemas/booking.ts";
import { bookingSelect, type BookingDTO } from "./booking-select.ts";
import { InvalidInputError, NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { withTransaction } from "../transaction.ts";

import type { Database } from "@animalesko/db";

import type {
  BookingStatus,
  CancelBookingInput,
  ListBookingsInput,
} from "../../schemas/booking.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface BookingDeps {
  db: Pick<Database, "booking" | "appointment" | "notification">;
}

export type ListBookingsCommand = ActorCommand & ListBookingsInput;

export class ListBookingsUseCase implements UseCase<ListBookingsCommand, BookingDTO[]> {
  constructor(private readonly deps: BookingDeps) {}

  execute({ actorId, status, limit }: ListBookingsCommand): Promise<BookingDTO[]> {
    return this.deps.db.booking.findMany({
      where: { tutorId: actorId, ...(status ? { status } : {}) },
      select: bookingSelect,
      orderBy: { startsAt: "desc" },
      take: limit,
    });
  }
}

export interface GetBookingCommand extends ActorCommand {
  bookingId: string;
}

export class GetBookingUseCase implements UseCase<GetBookingCommand, BookingDTO> {
  constructor(private readonly deps: BookingDeps) {}

  async execute({ actorId, bookingId }: GetBookingCommand): Promise<BookingDTO> {
    const booking = await this.deps.db.booking.findFirst({
      where: { id: bookingId, tutorId: actorId },
      select: bookingSelect,
    });

    if (!booking) {
      throw new NotFoundError("Agendamento não encontrado.");
    }

    return booking;
  }
}

export type CancelBookingCommand = ActorCommand & CancelBookingInput;

/**
 * Cancelling a booking.
 *
 * Cancels the provider's agenda entry in the same transaction: leaving the
 * `Appointment` behind would show the provider a slot the tutor believes is
 * gone, which is the kind of divergence having one database was supposed to
 * prevent.
 */
export class CancelBookingUseCase implements UseCase<CancelBookingCommand, BookingDTO> {
  constructor(private readonly deps: BookingDeps) {}

  async execute({ actorId, id, reason }: CancelBookingCommand): Promise<BookingDTO> {
    const existing = await this.deps.db.booking.findFirst({
      where: { id, tutorId: actorId },
      select: { id: true, status: true, orgId: true, code: true },
    });

    if (!existing) {
      throw new NotFoundError("Agendamento não encontrado.");
    }

    if (!CANCELLABLE_STATUSES.includes(existing.status as BookingStatus)) {
      throw new InvalidInputError("Este agendamento não pode mais ser cancelado.");
    }

    return withTransaction(this.deps.db, async (tx) => {
      const booking = await tx.booking.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason ?? null,
        },
        select: bookingSelect,
      });

      await tx.appointment.updateMany({
        where: { bookingId: existing.id },
        data: { status: "CANCELLED" },
      });

      await notify(tx, {
        userId: actorId,
        type: "SERVICE",
        title: "Agendamento cancelado",
        body: `${booking.offering.title} (${existing.code}) foi cancelado.`,
        href: "/historico",
      });

      return booking;
    });
  }
}
