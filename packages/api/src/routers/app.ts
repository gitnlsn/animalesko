import { createTRPCRouter } from "../trpc.ts";
import { alertRouter } from "./alert.ts";
import { bookingRouter } from "./booking.ts";
import { catalogRouter } from "./catalog.ts";
import { favoriteRouter } from "./favorite.ts";
import { gamificationRouter } from "./gamification.ts";
import { messageRouter } from "./message.ts";
import { notificationRouter } from "./notification.ts";
import { paymentRouter } from "./payment.ts";
import { petRouter } from "./pet.ts";
import { profileRouter } from "./profile.ts";
import { reviewRouter } from "./review.ts";

/**
 * Root router for apps/app (consumer).
 *
 * Deliberately separate from the `plus` router: each Vercel deployment mounts
 * only its own surface, so a provider-only procedure is not merely
 * unauthorised on the consumer app — it is not present at all.
 */
export const appRouter = createTRPCRouter({
  pet: petRouter,
  catalog: catalogRouter,
  favorite: favoriteRouter,
  booking: bookingRouter,
  payment: paymentRouter,
  review: reviewRouter,
  notification: notificationRouter,
  message: messageRouter,
  alert: alertRouter,
  gamification: gamificationRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
