import { createBookingSchema } from "../../schemas/booking.ts";
import { formatBRL, quotePriceCents } from "../../schemas/money.ts";
import { bookingSelect, generateBookingCode, type BookingDTO } from "./booking-select.ts";
import { ConflictError, InvalidInputError, NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";
import { withTransaction } from "../transaction.ts";

import type { Database } from "@animalesko/db";

import type { CreateBookingInput } from "../../schemas/booking.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface CreateBookingDeps {
  db: Pick<Database, "booking" | "pet" | "serviceOffering" | "notification">;
  /** Injectable so a test can make the booking code deterministic. */
  randomInt?: (max: number) => number;
}

export interface CreateBookingCommand extends ActorCommand {
  data: CreateBookingInput;
}

/** How many code collisions to ride out before giving up. */
const CODE_ATTEMPTS = 5;

/**
 * Books a service for one of the caller's pets.
 *
 * Three things happen together or not at all: the booking row, the provider's
 * agenda entry, and the tutor's confirmation notification. The `Appointment` is
 * the seam between the two applications — a booking made in `app` is what
 * shows up on the provider's calendar in `plus`, which is why it is created
 * here rather than left for the provider to transcribe.
 */
export class CreateBookingUseCase implements UseCase<CreateBookingCommand, BookingDTO> {
  constructor(private readonly deps: CreateBookingDeps) {}

  async execute(command: CreateBookingCommand): Promise<BookingDTO> {
    const { actorId } = command;
    const data = parseCommandData(createBookingSchema, command.data);

    if (data.startsAt.getTime() < Date.now()) {
      throw new InvalidInputError("Não é possível agendar para uma data que já passou.");
    }

    // Both scoped queries, so an id belonging to someone else — or an offering
    // the provider has withdrawn — is indistinguishable from one that does not
    // exist.
    const [pet, offering] = await Promise.all([
      this.deps.db.pet.findFirst({
        where: { id: data.petId, ownerId: actorId, deceasedAt: null },
        select: { id: true, name: true },
      }),
      this.deps.db.serviceOffering.findFirst({
        where: { id: data.offeringId, isActive: true },
        select: {
          id: true,
          title: true,
          priceCents: true,
          priceUnit: true,
          durationMinutes: true,
          orgId: true,
        },
      }),
    ]);

    if (!pet) throw new NotFoundError("Pet não encontrado.");
    if (!offering) throw new NotFoundError("Serviço não encontrado ou indisponível.");

    // Derived, never taken from the client.
    const priceCents = quotePriceCents(
      offering.priceCents,
      offering.priceUnit,
      data.startsAt,
      data.endsAt,
    );

    const randomInt = this.deps.randomInt ?? defaultRandomInt;

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = generateBookingCode(randomInt);

      try {
        return await withTransaction(this.deps.db, async (tx) => {
          const booking = await tx.booking.create({
            data: {
              code,
              status: "PENDING",
              startsAt: data.startsAt,
              endsAt: data.endsAt,
              priceCents,
              notes: data.notes ?? null,
              tutorId: actorId,
              petId: pet.id,
              offeringId: offering.id,
              orgId: offering.orgId,
              // The provider's agenda entry. Created in the same transaction so
              // `plus` can never see a booking that is missing from the
              // calendar, or vice versa.
              appointment: {
                create: {
                  serviceLabel: offering.title,
                  scheduledAt: data.startsAt,
                  durationMinutes:
                    offering.durationMinutes ??
                    Math.max(
                      15,
                      Math.round((data.endsAt.getTime() - data.startsAt.getTime()) / 60_000),
                    ),
                  status: "PENDING",
                  orgId: offering.orgId,
                  petId: pet.id,
                  tutorId: actorId,
                  serviceOfferingId: offering.id,
                },
              },
            },
            select: bookingSelect,
          });

          await notify(tx, {
            userId: actorId,
            type: "SERVICE",
            title: "Agendamento solicitado 🐾",
            body: `${offering.title} para ${pet.name} — ${formatBRL(priceCents)}. Aguardando confirmação do prestador.`,
            href: `/historico`,
          });

          return booking;
        });
      } catch (error) {
        // A duplicate code is the one failure worth retrying; anything else is
        // a real problem and must surface.
        if (isUniqueViolationOn(error, "code")) continue;
        throw error;
      }
    }

    throw new ConflictError("Não foi possível gerar um código de agendamento. Tente novamente.");
  }
}

function defaultRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}
