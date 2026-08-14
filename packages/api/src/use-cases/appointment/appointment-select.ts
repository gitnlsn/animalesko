import { NotFoundError } from "../errors.ts";

import type { Database, Prisma } from "@animalesko/db";

/**
 * What the agenda renders per row: when, what, for which animal, and who is
 * bringing it — which is either a registered tutor (the appointment came from a
 * consumer booking) or a walk-in `ClientContact`.
 */
export const appointmentSelect = {
  id: true,
  serviceLabel: true,
  scheduledAt: true,
  durationMinutes: true,
  status: true,
  notes: true,
  createdAt: true,
  pet: { select: { id: true, name: true, species: true, breed: true, photoUrl: true } },
  tutor: { select: { id: true, name: true, phone: true, email: true } },
  clientContact: { select: { id: true, name: true, phone: true, email: true } },
  serviceOffering: { select: { id: true, title: true, priceCents: true, priceUnit: true } },
  booking: { select: { id: true, code: true, status: true, priceCents: true } },
} satisfies Prisma.AppointmentSelect;

export type AppointmentDTO = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;

/**
 * The client's name and phone, wherever they came from.
 *
 * Two sources for one concept is a UI problem on every row otherwise: the
 * prototype only ever had loose strings, so every card read `appointment
 * .clientName`. This is the equivalent, resolved once.
 */
export function appointmentClient(appointment: AppointmentDTO): {
  name: string;
  phone: string | null;
  /** True when the client has an Animalesko account. */
  registered: boolean;
} {
  if (appointment.tutor) {
    return { name: appointment.tutor.name, phone: appointment.tutor.phone, registered: true };
  }

  if (appointment.clientContact) {
    return {
      name: appointment.clientContact.name,
      phone: appointment.clientContact.phone,
      registered: false,
    };
  }

  return { name: "Sem cliente", phone: null, registered: false };
}

export type AppointmentDb = Pick<Database, "appointment">;

/**
 * Loads an appointment belonging to the caller's organization, or throws.
 *
 * The `orgId` filter is part of the *query*, not a check after the fetch — the
 * same rule `loadOwnedPet` follows, so an id from another organization is
 * indistinguishable from one that was never issued.
 */
export async function loadOrgAppointment(
  db: AppointmentDb,
  params: { appointmentId: string; organizationId: string },
): Promise<AppointmentDTO> {
  const appointment = await db.appointment.findFirst({
    where: { id: params.appointmentId, orgId: params.organizationId },
    select: appointmentSelect,
  });

  if (!appointment) {
    throw new NotFoundError("Agendamento não encontrado.");
  }

  return appointment;
}
