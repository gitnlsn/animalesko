import {
  appointmentIdSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
  setAppointmentStatusSchema,
  updateAppointmentSchema,
} from "../schemas/appointment.ts";
import { createTRPCRouter, providerProcedure } from "../trpc.ts";

/**
 * The provider's agenda.
 *
 * `setStatus` is the seam back to the consumer app: it moves the linked
 * `Booking` and notifies the tutor, so a service confirmed here shows as
 * confirmed at :3000.
 */
export const appointmentRouter = createTRPCRouter({
  list: providerProcedure.input(listAppointmentsSchema).query(({ ctx, input }) =>
    ctx.useCases.appointment.list.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),

  byId: providerProcedure.input(appointmentIdSchema).query(({ ctx, input }) =>
    ctx.useCases.appointment.get.execute({
      organizationId: ctx.organization.id,
      appointmentId: input.id,
    }),
  ),

  create: providerProcedure.input(createAppointmentSchema).mutation(({ ctx, input }) =>
    ctx.useCases.appointment.create.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),

  update: providerProcedure.input(updateAppointmentSchema).mutation(({ ctx, input }) =>
    ctx.useCases.appointment.update.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),

  setStatus: providerProcedure.input(setAppointmentStatusSchema).mutation(({ ctx, input }) =>
    ctx.useCases.appointment.setStatus.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),
});
