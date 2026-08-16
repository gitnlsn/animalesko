import type { Database } from "@animalesko/db";

import { RegisterPushDeviceUseCase, UnregisterPushDeviceUseCase } from "./use-cases/push/index.ts";
import {
  CreateAnimalUseCase,
  GetAnimalUseCase,
  ListAnimalsUseCase,
  UpdateAnimalUseCase,
} from "./use-cases/animal/index.ts";
import {
  CreateAppointmentUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  SetAppointmentStatusUseCase,
  UpdateAppointmentUseCase,
} from "./use-cases/appointment/index.ts";
import {
  CreateClientContactUseCase,
  GetClientContactUseCase,
  ListClientContactsUseCase,
  UpdateClientContactUseCase,
} from "./use-cases/client-contact/index.ts";
import {
  CreateHealthRecordUseCase,
  CreateVaccinationUseCase,
  DeleteHealthRecordUseCase,
  DeleteVaccinationUseCase,
  ListDueVaccinationsUseCase,
  ListHealthRecordsUseCase,
  ListVaccinationsUseCase,
  UpdateVaccinationUseCase,
} from "./use-cases/clinical/index.ts";
import {
  CreateListingUseCase,
  DecideApplicationUseCase,
  GetProviderListingUseCase,
  ListApplicationsUseCase,
  ListListingsUseCase,
  SetListingStatusUseCase,
  UpdateListingUseCase,
} from "./use-cases/listing/index.ts";
import {
  GetOrganizationStatsUseCase,
  GetOrganizationUseCase,
  GetVerificationUseCase,
  SubmitVerificationUseCase,
  UpdateOrganizationUseCase,
} from "./use-cases/organization/index.ts";
import {
  CompleteReminderUseCase,
  CreateReminderUseCase,
  DeleteReminderUseCase,
  ListRemindersUseCase,
} from "./use-cases/reminder/index.ts";

import {
  CreateAlertUseCase,
  GetAlertUseCase,
  ListAlertsUseCase,
  ReportSightingUseCase,
  ResolveAlertUseCase,
} from "./use-cases/alert/index.ts";
import {
  CancelBookingUseCase,
  CreateBookingUseCase,
  GetBookingUseCase,
  ListBookingsUseCase,
} from "./use-cases/booking/index.ts";
import {
  BrowseListingsUseCase,
  BrowseOfferingsUseCase,
  GetCatalogStatsUseCase,
  GetListingUseCase,
  PetOfTheDayUseCase,
} from "./use-cases/catalog/index.ts";
import {
  ListFavoriteIdsUseCase,
  ListFavoriteListingsUseCase,
  ListFavoriteOfferingsUseCase,
  ToggleFavoriteListingUseCase,
  ToggleFavoriteOfferingUseCase,
} from "./use-cases/favorite/index.ts";
import { GetGamificationProfileUseCase } from "./use-cases/gamification/index.ts";
import {
  ListConversationsUseCase,
  ListMessagesUseCase,
  MarkConversationReadUseCase,
  OpenConversationUseCase,
  SendMessageUseCase,
} from "./use-cases/message/index.ts";
import {
  CountUnreadNotificationsUseCase,
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from "./use-cases/notification/index.ts";
import {
  CreateOfferingUseCase,
  DeleteOfferingUseCase,
  ListOfferingsUseCase,
  UpdateOfferingUseCase,
} from "./use-cases/offering/index.ts";
import { GetBookingPaymentUseCase, PayBookingUseCase } from "./use-cases/payment/index.ts";
import {
  CreatePetUseCase,
  DeletePetUseCase,
  GetPetQuotaUseCase,
  GetPetUseCase,
  ListPetsUseCase,
  UpdatePetUseCase,
} from "./use-cases/pet/index.ts";
import { GetProfileUseCase, UpdateProfileUseCase } from "./use-cases/profile/index.ts";
import {
  CreateReviewUseCase,
  ListMyReviewsUseCase,
  ListReviewableBookingsUseCase,
  ListReviewsByOrgUseCase,
} from "./use-cases/review/index.ts";

/**
 * Composition root.
 *
 * Everything a use case needs is assembled here and nowhere else, so adding an
 * external service later (a payment gateway, a mailer, an object store) means
 * widening this one interface rather than threading it through every router.
 */
export interface UseCaseDeps {
  db: Database;
}

export function createUseCases(deps: UseCaseDeps) {
  return {
    pet: {
      list: new ListPetsUseCase(deps),
      get: new GetPetUseCase(deps),
      quota: new GetPetQuotaUseCase(deps),
      create: new CreatePetUseCase(deps),
      update: new UpdatePetUseCase(deps),
      delete: new DeletePetUseCase(deps),
    },
    offering: {
      list: new ListOfferingsUseCase(deps),
      create: new CreateOfferingUseCase(deps),
      update: new UpdateOfferingUseCase(deps),
      delete: new DeleteOfferingUseCase(deps),
    },
    catalog: {
      offerings: new BrowseOfferingsUseCase(deps),
      listings: new BrowseListingsUseCase(deps),
      listing: new GetListingUseCase(deps),
      petOfTheDay: new PetOfTheDayUseCase(deps),
      stats: new GetCatalogStatsUseCase(deps),
    },
    favorite: {
      listings: new ListFavoriteListingsUseCase(deps),
      offerings: new ListFavoriteOfferingsUseCase(deps),
      ids: new ListFavoriteIdsUseCase(deps),
      toggleListing: new ToggleFavoriteListingUseCase(deps),
      toggleOffering: new ToggleFavoriteOfferingUseCase(deps),
    },
    booking: {
      list: new ListBookingsUseCase(deps),
      get: new GetBookingUseCase(deps),
      create: new CreateBookingUseCase(deps),
      cancel: new CancelBookingUseCase(deps),
    },
    payment: {
      forBooking: new GetBookingPaymentUseCase(deps),
      pay: new PayBookingUseCase(deps),
    },
    review: {
      byOrg: new ListReviewsByOrgUseCase(deps),
      mine: new ListMyReviewsUseCase(deps),
      pending: new ListReviewableBookingsUseCase(deps),
      create: new CreateReviewUseCase(deps),
    },
    notification: {
      list: new ListNotificationsUseCase(deps),
      unreadCount: new CountUnreadNotificationsUseCase(deps),
      markRead: new MarkNotificationReadUseCase(deps),
      markAllRead: new MarkAllNotificationsReadUseCase(deps),
    },
    push: {
      register: new RegisterPushDeviceUseCase(deps),
      unregister: new UnregisterPushDeviceUseCase(deps),
    },
    message: {
      conversations: new ListConversationsUseCase(deps),
      thread: new ListMessagesUseCase(deps),
      send: new SendMessageUseCase(deps),
      markRead: new MarkConversationReadUseCase(deps),
      open: new OpenConversationUseCase(deps),
    },
    alert: {
      list: new ListAlertsUseCase(deps),
      get: new GetAlertUseCase(deps),
      create: new CreateAlertUseCase(deps),
      reportSighting: new ReportSightingUseCase(deps),
      resolve: new ResolveAlertUseCase(deps),
    },
    gamification: {
      profile: new GetGamificationProfileUseCase(deps),
    },
    profile: {
      get: new GetProfileUseCase(deps),
      update: new UpdateProfileUseCase(deps),
    },

    // --- Provider surface (apps/plus) ---------------------------------------
    organization: {
      get: new GetOrganizationUseCase(deps),
      update: new UpdateOrganizationUseCase(deps),
      stats: new GetOrganizationStatsUseCase(deps),
      verification: new GetVerificationUseCase(deps),
      submitVerification: new SubmitVerificationUseCase(deps),
    },
    appointment: {
      list: new ListAppointmentsUseCase(deps),
      get: new GetAppointmentUseCase(deps),
      create: new CreateAppointmentUseCase(deps),
      update: new UpdateAppointmentUseCase(deps),
      setStatus: new SetAppointmentStatusUseCase(deps),
    },
    clientContact: {
      list: new ListClientContactsUseCase(deps),
      get: new GetClientContactUseCase(deps),
      create: new CreateClientContactUseCase(deps),
      update: new UpdateClientContactUseCase(deps),
    },
    animal: {
      list: new ListAnimalsUseCase(deps),
      get: new GetAnimalUseCase(deps),
      create: new CreateAnimalUseCase(deps),
      update: new UpdateAnimalUseCase(deps),
    },
    clinical: {
      healthRecords: new ListHealthRecordsUseCase(deps),
      addHealthRecord: new CreateHealthRecordUseCase(deps),
      deleteHealthRecord: new DeleteHealthRecordUseCase(deps),
      vaccinations: new ListVaccinationsUseCase(deps),
      addVaccination: new CreateVaccinationUseCase(deps),
      updateVaccination: new UpdateVaccinationUseCase(deps),
      deleteVaccination: new DeleteVaccinationUseCase(deps),
      dueVaccinations: new ListDueVaccinationsUseCase(deps),
    },
    listing: {
      list: new ListListingsUseCase(deps),
      get: new GetProviderListingUseCase(deps),
      create: new CreateListingUseCase(deps),
      update: new UpdateListingUseCase(deps),
      setStatus: new SetListingStatusUseCase(deps),
      applications: new ListApplicationsUseCase(deps),
      decide: new DecideApplicationUseCase(deps),
    },
    reminder: {
      list: new ListRemindersUseCase(deps),
      create: new CreateReminderUseCase(deps),
      complete: new CompleteReminderUseCase(deps),
      delete: new DeleteReminderUseCase(deps),
    },
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
