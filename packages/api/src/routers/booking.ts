import {
  bookingIdSchema,
  cancelBookingSchema,
  createBookingSchema,
  listBookingsSchema,
} from "../schemas/booking.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Booking a service. The price is never an input — `create` derives it from the
 * offering, so the total the client previewed cannot become the total charged.
 */
export const bookingRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listBookingsSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.booking.list.execute({ actorId: ctx.user.id, ...input }),
    ),

  byId: protectedProcedure
    .input(bookingIdSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.booking.get.execute({ actorId: ctx.user.id, bookingId: input.id }),
    ),

  create: protectedProcedure
    .input(createBookingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.booking.create.execute({ actorId: ctx.user.id, data: input }),
    ),

  cancel: protectedProcedure
    .input(cancelBookingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.booking.cancel.execute({ actorId: ctx.user.id, ...input }),
    ),
});
