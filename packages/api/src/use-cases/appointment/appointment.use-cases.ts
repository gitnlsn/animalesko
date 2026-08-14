import {
  canTransition,
  createAppointmentSchema,
  formatAppointmentStatus,
  updateAppointmentSchema,
  type AppointmentPeriod,
  type AppointmentStatus,
  type CreateAppointmentInput,
  type ListAppointmentsInput,
  type SetAppointmentStatusInput,
  type UpdateAppointmentInput,
} from "../../schemas/appointment.ts";
import {
  appointmentSelect,
  loadOrgAppointment,
  type AppointmentDTO,
} from "./appointment-select.ts";
import { InvalidInputError, NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { withTransaction } from "../transaction.ts";
import { parseCommandData } from "../validate.ts";

import type { BookingStatus, Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface AppointmentDeps {
  db: Pick<
    Database,
    "appointment" | "booking" | "clientContact" | "pet" | "notification" | "organization"
  >;
}

/**
 * The period filter, as a date range.
 *
 * Boundaries are local-midnight rather than UTC: a provider filtering "hoje"
 * means their working day, and on UTC-3 a UTC-midnight boundary would fold the
 * evening's appointments into tomorrow.
 */
function periodRange(period: AppointmentPeriod, now: Date): Prisma.DateTimeFilter | undefined {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "all":
      return undefined;
    case "today": {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 1);
      return { gte: startOfToday, lt: end };
    }
    case "week": {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 7);
      return { gte: startOfToday, lt: end };
    }
    case "month": {
      const end = new Date(startOfToday);
      end.setMonth(end.getMonth() + 1);
      return { gte: startOfToday, lt: end };
    }
    case "upcoming":
      return { gte: now };
  }
}

/** Case-insensitive match across client name, pet name and service label. */
function textSearch(q: string): Prisma.AppointmentWhereInput[] {
  const contains = { contains: q, mode: "insensitive" } as const;

  return [
    { serviceLabel: contains },
    { pet: { name: contains } },
    { tutor: { name: contains } },
    { clientContact: { name: contains } },
  ];
}

export type ListAppointmentsCommand = OrganizationCommand & ListAppointmentsInput;

export class ListAppointmentsUseCase implements UseCase<ListAppointmentsCommand, AppointmentDTO[]> {
  constructor(private readonly deps: AppointmentDeps) {}

  execute(
    { organizationId, status, period, q, limit }: ListAppointmentsCommand,
    now = new Date(),
  ): Promise<AppointmentDTO[]> {
    const scheduledAt = periodRange(period, now);

    return this.deps.db.appointment.findMany({
      where: {
        orgId: organizationId,
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduledAt } : {}),
        ...(q ? { OR: textSearch(q) } : {}),
      },
      select: appointmentSelect,
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
  }
}

export interface GetAppointmentCommand extends OrganizationCommand {
  appointmentId: string;
}

export class GetAppointmentUseCase implements UseCase<GetAppointmentCommand, AppointmentDTO> {
  constructor(private readonly deps: AppointmentDeps) {}

  execute({ organizationId, appointmentId }: GetAppointmentCommand): Promise<AppointmentDTO> {
    return loadOrgAppointment(this.deps.db, { appointmentId, organizationId });
  }
}

export interface CreateAppointmentCommand extends OrganizationCommand {
  data: CreateAppointmentInput;
}

/**
 * Books a walk-in into the agenda.
 *
 * No `Booking` and no payment: this is the provider writing in their own diary
 * for someone who phoned. Appointments that *do* have a booking are created by
 * the consumer app (`create-booking.use-case.ts`) and never through here.
 */
export class CreateAppointmentUseCase implements UseCase<CreateAppointmentCommand, AppointmentDTO> {
  constructor(private readonly deps: AppointmentDeps) {}

  async execute(command: CreateAppointmentCommand): Promise<AppointmentDTO> {
    const { organizationId } = command;
    const data = parseCommandData(createAppointmentSchema, command.data);

    // A pet may only be attached if this organization already has a
    // relationship with it — it holds it in custody, or has seen it before.
    if (data.petId) {
      const pet = await this.deps.db.pet.findFirst({
        where: {
          id: data.petId,
          OR: [
            { custodianOrgId: organizationId },
            { appointments: { some: { orgId: organizationId } } },
          ],
        },
        select: { id: true },
      });

      if (!pet) throw new NotFoundError("Animal não encontrado nesta organização.");
    }

    return withTransaction(this.deps.db, async (tx) => {
      const clientContactId =
        data.clientContactId ?? (await upsertWalkIn(tx, organizationId, data));

      return tx.appointment.create({
        data: {
          orgId: organizationId,
          serviceLabel: data.serviceLabel,
          scheduledAt: data.scheduledAt,
          durationMinutes: data.durationMinutes,
          notes: data.notes ?? null,
          // A provider writing in their own diary has already agreed the time
          // with the client; there is nobody left to confirm it.
          status: "CONFIRMED",
          petId: data.petId ?? null,
          clientContactId,
        },
        select: appointmentSelect,
      });
    });
  }
}

/**
 * Creates or reuses the walk-in client.
 *
 * `@@unique([orgId, phone])` means the same person phoning twice is one contact
 * with two appointments, rather than the prototype's two unrelated rows — which
 * is what made client history impossible there.
 */
async function upsertWalkIn(
  tx: Pick<Prisma.TransactionClient, "clientContact">,
  organizationId: string,
  data: CreateAppointmentInput,
): Promise<string | null> {
  if (!data.newClient) return null;

  const contact = await tx.clientContact.upsert({
    where: { orgId_phone: { orgId: organizationId, phone: data.newClient.phone } },
    update: { name: data.newClient.name },
    create: {
      orgId: organizationId,
      name: data.newClient.name,
      phone: data.newClient.phone,
      email: data.newClient.email || null,
    },
    select: { id: true },
  });

  return contact.id;
}

export type UpdateAppointmentCommand = OrganizationCommand & UpdateAppointmentInput;

export class UpdateAppointmentUseCase implements UseCase<UpdateAppointmentCommand, AppointmentDTO> {
  constructor(private readonly deps: AppointmentDeps) {}

  async execute(command: UpdateAppointmentCommand): Promise<AppointmentDTO> {
    const { organizationId } = command;
    const { id, ...data } = parseCommandData(updateAppointmentSchema, {
      id: command.id,
      serviceLabel: command.serviceLabel,
      scheduledAt: command.scheduledAt,
      durationMinutes: command.durationMinutes,
      notes: command.notes,
    });

    const existing = await loadOrgAppointment(this.deps.db, {
      appointmentId: id,
      organizationId,
    });

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new InvalidInputError("Um agendamento encerrado não pode ser alterado.");
    }

    return withTransaction(this.deps.db, async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data,
        select: appointmentSelect,
      });

      // Rescheduling an appointment that came from a booking has to move the
      // booking too, or the tutor's history shows the old time.
      if (existing.booking && data.scheduledAt) {
        const span = (existing.durationMinutes ?? 60) * 60_000;

        await tx.booking.update({
          where: { id: existing.booking.id },
          data: {
            startsAt: data.scheduledAt,
            endsAt: new Date(data.scheduledAt.getTime() + span),
          },
        });

        if (appointment.tutor) {
          await notify(tx, {
            userId: appointment.tutor.id,
            type: "SERVICE",
            title: "Seu agendamento foi remarcado",
            body: `${appointment.serviceLabel} tem novo horário.`,
            href: "/historico",
          });
        }
      }

      return appointment;
    });
  }
}

export type SetAppointmentStatusCommand = OrganizationCommand & SetAppointmentStatusInput;

/**
 * Moves an appointment through its lifecycle, keeping the linked booking in
 * step.
 *
 * This is the seam between the two applications in the provider→consumer
 * direction: `create-booking.use-case.ts` writes an appointment when a tutor
 * books, and this writes back to the booking when the provider acts on it. A
 * status that moved on only one side is exactly the divergence one database was
 * supposed to prevent.
 */
export class SetAppointmentStatusUseCase implements UseCase<
  SetAppointmentStatusCommand,
  AppointmentDTO
> {
  constructor(private readonly deps: AppointmentDeps) {}

  async execute({
    organizationId,
    id,
    status,
  }: SetAppointmentStatusCommand): Promise<AppointmentDTO> {
    const existing = await loadOrgAppointment(this.deps.db, {
      appointmentId: id,
      organizationId,
    });

    const from = existing.status as AppointmentStatus;

    if (from === status) return existing;

    if (!canTransition(from, status)) {
      throw new InvalidInputError(
        `Não é possível mudar de ${formatAppointmentStatus(from)} para ${formatAppointmentStatus(status)}.`,
      );
    }

    return withTransaction(this.deps.db, async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data: { status },
        select: appointmentSelect,
      });

      if (existing.booking) {
        await tx.booking.update({
          where: { id: existing.booking.id },
          data: {
            status: BOOKING_STATUS_FOR[status],
            ...(status === "CANCELLED"
              ? { cancelledAt: new Date(), cancellationReason: "Cancelado pelo prestador." }
              : {}),
          },
        });
      }

      if (appointment.tutor) {
        const message = TUTOR_NOTIFICATION[status];

        if (message) {
          await notify(tx, {
            userId: appointment.tutor.id,
            type: "SERVICE",
            title: message.title,
            body: `${appointment.serviceLabel} — ${message.body}`,
            href: "/historico",
          });
        }
      }

      return appointment;
    });
  }
}

/**
 * Appointment status → booking status.
 *
 * The two enums are deliberately separate in the schema (a booking has
 * `IN_PROGRESS`, an appointment does not) but the overlapping states must agree.
 */
const BOOKING_STATUS_FOR: Record<AppointmentStatus, BookingStatus> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

/** What the tutor hears about, and what they do not. */
const TUTOR_NOTIFICATION: Partial<Record<AppointmentStatus, { title: string; body: string }>> = {
  CONFIRMED: { title: "Agendamento confirmado ✅", body: "o prestador confirmou seu horário." },
  COMPLETED: {
    title: "Serviço realizado 🐾",
    body: "que tal avaliar o atendimento?",
  },
  CANCELLED: { title: "Agendamento cancelado", body: "o prestador cancelou este horário." },
  // NO_SHOW is a note the provider keeps for themselves; telling the tutor they
  // did not turn up serves nobody.
};
