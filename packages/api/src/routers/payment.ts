import { bookingPaymentSchema, payBookingSchema } from "../schemas/payment.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

export const paymentRouter = createTRPCRouter({
  forBooking: protectedProcedure
    .input(bookingPaymentSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.payment.forBooking.execute({ actorId: ctx.user.id, bookingId: input.bookingId }),
    ),

  pay: protectedProcedure
    .input(payBookingSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.payment.pay.execute({ actorId: ctx.user.id, data: input }),
    ),
});
