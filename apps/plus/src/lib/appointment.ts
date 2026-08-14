import type { AppointmentDTO } from "@animalesko/api";
import type { AppointmentStatus } from "@animalesko/api/schemas";

/**
 * Who is bringing the animal.
 *
 * An appointment's client is either a registered tutor (it came from a consumer
 * booking) or a walk-in `ClientContact`. The prototype only ever had one loose
 * `clientName` string, so every card read it directly; this resolves the two
 * sources once instead of branching at every call site.
 */
export function appointmentClientLabel(appointment: AppointmentDTO): string {
  return appointment.tutor?.name ?? appointment.clientContact?.name ?? "Sem cliente";
}

export function appointmentClientPhone(appointment: AppointmentDTO): string | null {
  return appointment.tutor?.phone ?? appointment.clientContact?.phone ?? null;
}

/** True when the client has an Animalesko account, which changes what we can offer. */
export function isRegisteredClient(appointment: AppointmentDTO): boolean {
  return appointment.tutor !== null;
}

export const APPOINTMENT_STATUS_VARIANT: Record<
  AppointmentStatus,
  "success" | "warning" | "default" | "destructive" | "muted"
> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "default",
  CANCELLED: "destructive",
  NO_SHOW: "muted",
};
