import { createTRPCRouter } from "../trpc.ts";
import { animalRouter } from "./animal.ts";
import { appointmentRouter } from "./appointment.ts";
import { clientContactRouter } from "./client-contact.ts";
import { clinicalRouter } from "./clinical.ts";
import { listingRouter } from "./listing.ts";
import { notificationRouter } from "./notification.ts";
import { offeringRouter } from "./offering.ts";
import { organizationRouter } from "./organization.ts";
import { petRouter } from "./pet.ts";
import { reminderRouter } from "./reminder.ts";
import { reviewRouter } from "./review.ts";

/**
 * Root router for apps/plus (provider).
 *
 * `pet` and `reminder` are shared with the consumer app on purpose: a provider
 * is also a person, with their own animals and their own notes-to-self, and
 * both apps read the same rows. Everything else here is organization-scoped and
 * absent from the consumer surface entirely.
 */
export const plusRouter = createTRPCRouter({
  pet: petRouter,
  reminder: reminderRouter,
  notification: notificationRouter,
  review: reviewRouter,

  organization: organizationRouter,
  offering: offeringRouter,
  appointment: appointmentRouter,
  clientContact: clientContactRouter,
  animal: animalRouter,
  clinical: clinicalRouter,
  listing: listingRouter,
});

export type PlusRouter = typeof plusRouter;
