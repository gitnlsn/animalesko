import {
  submitVerificationSchema,
  updateOrganizationSchema,
  type SubmitVerificationInput,
  type UpdateOrganizationInput,
} from "../../schemas/organization.ts";
import { NotFoundError } from "../errors.ts";
import { withTransaction } from "../transaction.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface OrganizationDeps {
  db: Pick<
    Database,
    | "organization"
    | "providerVerification"
    | "appointment"
    | "pet"
    | "serviceOffering"
    | "booking"
    | "adoptionListing"
    | "adoptionApplication"
    | "review"
  >;
}

const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  type: true,
  description: true,
  avatarUrl: true,
  phone: true,
  email: true,
  addressLine: true,
  city: true,
  state: true,
  postalCode: true,
  ratingAvg: true,
  ratingCount: true,
  verificationStatus: true,
  createdAt: true,
  _count: { select: { members: true } },
} satisfies Prisma.OrganizationSelect;

export type OrganizationDTO = Prisma.OrganizationGetPayload<{ select: typeof organizationSelect }>;

export class GetOrganizationUseCase implements UseCase<OrganizationCommand, OrganizationDTO> {
  constructor(private readonly deps: OrganizationDeps) {}

  async execute({ organizationId }: OrganizationCommand): Promise<OrganizationDTO> {
    const organization = await this.deps.db.organization.findUnique({
      where: { id: organizationId },
      select: organizationSelect,
    });

    if (!organization) {
      throw new NotFoundError("Organização não encontrada.");
    }

    return organization;
  }
}

export interface UpdateOrganizationCommand extends OrganizationCommand {
  data: UpdateOrganizationInput;
}

export class UpdateOrganizationUseCase implements UseCase<
  UpdateOrganizationCommand,
  OrganizationDTO
> {
  constructor(private readonly deps: OrganizationDeps) {}

  execute(command: UpdateOrganizationCommand): Promise<OrganizationDTO> {
    const data = parseCommandData(updateOrganizationSchema, command.data);

    return this.deps.db.organization.update({
      where: { id: command.organizationId },
      data: {
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        // "" is accepted so the form can clear a field; stored as NULL so
        // "not provided" has one representation.
        phone: data.phone || null,
        email: data.email || null,
        addressLine: data.addressLine ?? null,
        city: data.city ?? null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        avatarUrl: data.avatarUrl || null,
      },
      select: organizationSelect,
    });
  }
}

export interface OrganizationStats {
  appointmentsToday: number;
  appointmentsWeek: number;
  pendingAppointments: number;
  animalsInCustody: number;
  activeOfferings: number;
  availableListings: number;
  openApplications: number;
  ratingAvg: number;
  ratingCount: number;
}

/**
 * The dashboard's counters.
 *
 * Every one is a real count. The prototype's four cards were `pets.length`,
 * `upcomingEvents.length` over a hardcoded array, a literal `2` for "Pets
 * Saudáveis" and `alerts.length` over two invented warnings.
 */
export class GetOrganizationStatsUseCase implements UseCase<
  OrganizationCommand,
  OrganizationStats
> {
  constructor(private readonly deps: OrganizationDeps) {}

  async execute(
    { organizationId }: OrganizationCommand,
    now = new Date(),
  ): Promise<OrganizationStats> {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(startOfToday);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Not `as const`: Prisma's `in` filter takes a mutable array.
    const live: Prisma.EnumAppointmentStatusFilter = { in: ["PENDING", "CONFIRMED"] };

    const [
      appointmentsToday,
      appointmentsWeek,
      pendingAppointments,
      animalsInCustody,
      activeOfferings,
      availableListings,
      openApplications,
      organization,
    ] = await Promise.all([
      this.deps.db.appointment.count({
        where: {
          orgId: organizationId,
          status: live,
          scheduledAt: { gte: startOfToday, lt: tomorrow },
        },
      }),
      this.deps.db.appointment.count({
        where: {
          orgId: organizationId,
          status: live,
          scheduledAt: { gte: startOfToday, lt: nextWeek },
        },
      }),
      this.deps.db.appointment.count({ where: { orgId: organizationId, status: "PENDING" } }),
      this.deps.db.pet.count({ where: { custodianOrgId: organizationId, deceasedAt: null } }),
      this.deps.db.serviceOffering.count({ where: { orgId: organizationId, isActive: true } }),
      this.deps.db.adoptionListing.count({
        where: { orgId: organizationId, status: "AVAILABLE" },
      }),
      this.deps.db.adoptionApplication.count({
        where: {
          listing: { orgId: organizationId },
          status: { in: ["SUBMITTED", "IN_REVIEW"] },
        },
      }),
      this.deps.db.organization.findUnique({
        where: { id: organizationId },
        select: { ratingAvg: true, ratingCount: true },
      }),
    ]);

    return {
      appointmentsToday,
      appointmentsWeek,
      pendingAppointments,
      animalsInCustody,
      activeOfferings,
      availableListings,
      openApplications,
      ratingAvg: organization?.ratingAvg ?? 0,
      ratingCount: organization?.ratingCount ?? 0,
    };
  }
}

// --- Verification ------------------------------------------------------------

const verificationSelect = {
  id: true,
  status: true,
  documentUrl: true,
  addressProofUrl: true,
  certificatesUrl: true,
  experienceYears: true,
  experienceDescription: true,
  submittedAt: true,
  reviewedAt: true,
  rejectionReason: true,
} satisfies Prisma.ProviderVerificationSelect;

export type VerificationDTO = Prisma.ProviderVerificationGetPayload<{
  select: typeof verificationSelect;
}>;

export class GetVerificationUseCase implements UseCase<
  OrganizationCommand,
  VerificationDTO | null
> {
  constructor(private readonly deps: OrganizationDeps) {}

  execute({ organizationId }: OrganizationCommand): Promise<VerificationDTO | null> {
    return this.deps.db.providerVerification.findUnique({
      where: { orgId: organizationId },
      select: verificationSelect,
    });
  }
}

export interface SubmitVerificationCommand extends OrganizationCommand {
  data: SubmitVerificationInput;
}

/**
 * Sends the organization's documents for review.
 *
 * Writes both the `ProviderVerification` row and the denormalised
 * `Organization.verificationStatus` the consumer app reads for the badge —
 * together, so a submitted application and a stale "not submitted" badge cannot
 * coexist. Re-submitting after a rejection is allowed and resets the review.
 */
export class SubmitVerificationUseCase implements UseCase<
  SubmitVerificationCommand,
  VerificationDTO
> {
  constructor(private readonly deps: OrganizationDeps) {}

  async execute(command: SubmitVerificationCommand): Promise<VerificationDTO> {
    const { organizationId } = command;
    const data = parseCommandData(submitVerificationSchema, command.data);

    const payload = {
      status: "PENDING" as const,
      documentUrl: data.documentUrl,
      addressProofUrl: data.addressProofUrl,
      certificatesUrl: data.certificatesUrl || null,
      experienceYears: data.experienceYears ?? null,
      experienceDescription: data.experienceDescription ?? null,
      submittedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
    };

    return withTransaction(this.deps.db, async (tx) => {
      const verification = await tx.providerVerification.upsert({
        where: { orgId: organizationId },
        create: { orgId: organizationId, ...payload },
        update: payload,
        select: verificationSelect,
      });

      await tx.organization.update({
        where: { id: organizationId },
        data: { verificationStatus: "PENDING" },
      });

      return verification;
    });
  }
}
