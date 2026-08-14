import {
  canTransitionListing,
  createListingSchema,
  formatAdoptionStatus,
  updateListingSchema,
  type AdoptionStatus,
  type CreateListingInput,
  type DecideApplicationInput,
  type ListListingsInput,
  type SetListingStatusInput,
  type UpdateListingInput,
} from "../../schemas/listing.ts";
import { ConflictError, InvalidInputError, NotFoundError } from "../errors.ts";
import { notify } from "../notification/notify.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { withTransaction } from "../transaction.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface ListingDeps {
  db: Pick<
    Database,
    "adoptionListing" | "adoptionListingPhoto" | "adoptionApplication" | "pet" | "notification"
  >;
}

const listingSelect = {
  id: true,
  status: true,
  urgency: true,
  summary: true,
  story: true,
  city: true,
  state: true,
  publishedAt: true,
  adoptedAt: true,
  createdAt: true,
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      sex: true,
      size: true,
      birthDate: true,
      photoUrl: true,
      temperament: true,
      neutered: true,
    },
  },
  photos: { select: { id: true, url: true, position: true }, orderBy: { position: "asc" } },
  _count: { select: { applications: true, favorites: true } },
} satisfies Prisma.AdoptionListingSelect;

export type ProviderListingDTO = Prisma.AdoptionListingGetPayload<{
  select: typeof listingSelect;
}>;

const applicationSelect = {
  id: true,
  status: true,
  message: true,
  answers: true,
  decidedAt: true,
  createdAt: true,
  applicant: {
    select: { id: true, name: true, email: true, phone: true, city: true, state: true },
  },
  listing: { select: { id: true, pet: { select: { name: true } } } },
} satisfies Prisma.AdoptionApplicationSelect;

export type ApplicationDTO = Prisma.AdoptionApplicationGetPayload<{
  select: typeof applicationSelect;
}>;

export type ListListingsCommand = OrganizationCommand & ListListingsInput;

export class ListListingsUseCase implements UseCase<ListListingsCommand, ProviderListingDTO[]> {
  constructor(private readonly deps: ListingDeps) {}

  execute({ organizationId, status, limit }: ListListingsCommand): Promise<ProviderListingDTO[]> {
    return this.deps.db.adoptionListing.findMany({
      where: { orgId: organizationId, ...(status ? { status } : {}) },
      select: listingSelect,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: limit,
    });
  }
}

export interface GetListingCommand extends OrganizationCommand {
  listingId: string;
}

export class GetProviderListingUseCase implements UseCase<GetListingCommand, ProviderListingDTO> {
  constructor(private readonly deps: ListingDeps) {}

  async execute({ organizationId, listingId }: GetListingCommand): Promise<ProviderListingDTO> {
    const listing = await this.deps.db.adoptionListing.findFirst({
      where: { id: listingId, orgId: organizationId },
      select: listingSelect,
    });

    if (!listing) {
      throw new NotFoundError("Anúncio não encontrado.");
    }

    return listing;
  }
}

export interface CreateListingCommand extends OrganizationCommand {
  data: CreateListingInput;
}

/**
 * Publishes one of the organization's animals for adoption.
 *
 * Starts as DRAFT: `AdoptionListing.status` defaults that way in the schema and
 * a shelter should be able to write the story before the world sees it. The
 * animal must be in this organization's custody — you cannot list a dog you do
 * not have.
 */
export class CreateListingUseCase implements UseCase<CreateListingCommand, ProviderListingDTO> {
  constructor(private readonly deps: ListingDeps) {}

  async execute(command: CreateListingCommand): Promise<ProviderListingDTO> {
    const { organizationId } = command;
    const { petId, photoUrls, ...data } = parseCommandData(createListingSchema, command.data);

    const pet = await this.deps.db.pet.findFirst({
      where: { id: petId, custodianOrgId: organizationId },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundError("Animal não encontrado sob a guarda desta organização.");
    }

    try {
      return await this.deps.db.adoptionListing.create({
        data: {
          ...data,
          petId,
          orgId: organizationId,
          status: "DRAFT",
          photos: { create: photoUrls.map((url, position) => ({ url, position })) },
        },
        select: listingSelect,
      });
    } catch (error) {
      // `AdoptionListing.petId` is unique — one animal, one listing.
      if (isUniqueViolationOn(error, "petId")) {
        throw new ConflictError("Este animal já tem um anúncio.", { cause: error });
      }
      throw error;
    }
  }
}

export type UpdateListingCommand = OrganizationCommand & UpdateListingInput;

export class UpdateListingUseCase implements UseCase<UpdateListingCommand, ProviderListingDTO> {
  constructor(private readonly deps: ListingDeps) {}

  async execute(command: UpdateListingCommand): Promise<ProviderListingDTO> {
    const { organizationId } = command;
    const { id, photoUrls, ...data } = parseCommandData(updateListingSchema, {
      ...command,
      organizationId: undefined,
    });

    const existing = await this.deps.db.adoptionListing.findFirst({
      where: { id, orgId: organizationId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundError("Anúncio não encontrado.");
    }

    if (existing.status === "ADOPTED") {
      throw new InvalidInputError("Um anúncio já concluído não pode ser editado.");
    }

    return withTransaction(this.deps.db, async (tx) => {
      // Photos are replaced wholesale rather than diffed: the editor hands back
      // the full ordered list, and reconciling positions one by one would be
      // more code for an identical result.
      if (photoUrls) {
        await tx.adoptionListingPhoto.deleteMany({ where: { listingId: id } });
        await tx.adoptionListingPhoto.createMany({
          data: photoUrls.map((url, position) => ({ listingId: id, url, position })),
        });
      }

      return tx.adoptionListing.update({ where: { id }, data, select: listingSelect });
    });
  }
}

export type SetListingStatusCommand = OrganizationCommand & SetListingStatusInput;

/**
 * Moves a listing through its lifecycle.
 *
 * ADOPTED is the one that does real work: it transfers the animal to the
 * approved applicant and releases the shelter's custody. Doing that anywhere
 * else — or forgetting it — would leave an adopted animal owned by nobody and
 * still on the shelter's books, which is precisely the state the schema comment
 * in `pets.prisma` warns about.
 */
export class SetListingStatusUseCase implements UseCase<
  SetListingStatusCommand,
  ProviderListingDTO
> {
  constructor(private readonly deps: ListingDeps) {}

  async execute({
    organizationId,
    id,
    status,
    adopterApplicationId,
  }: SetListingStatusCommand): Promise<ProviderListingDTO> {
    const existing = await this.deps.db.adoptionListing.findFirst({
      where: { id, orgId: organizationId },
      select: { id: true, status: true, petId: true, pet: { select: { name: true } } },
    });

    if (!existing) {
      throw new NotFoundError("Anúncio não encontrado.");
    }

    const from = existing.status as AdoptionStatus;

    if (from === status) {
      return this.deps.db.adoptionListing.findFirstOrThrow({
        where: { id },
        select: listingSelect,
      });
    }

    if (!canTransitionListing(from, status)) {
      throw new InvalidInputError(
        `Não é possível mudar de ${formatAdoptionStatus(from)} para ${formatAdoptionStatus(status)}.`,
      );
    }

    const adopter =
      status === "ADOPTED" ? await this.resolveAdopter(id, adopterApplicationId) : null;

    return withTransaction(this.deps.db, async (tx) => {
      const listing = await tx.adoptionListing.update({
        where: { id },
        data: {
          status,
          // Stamped on first publish and kept, so the feed's ordering does not
          // jump when a listing is briefly pulled back to DRAFT and re-posted.
          ...(status === "AVAILABLE" ? { publishedAt: new Date() } : {}),
          ...(status === "ADOPTED" ? { adoptedAt: new Date() } : {}),
        },
        select: listingSelect,
      });

      if (adopter) {
        // The adoption itself.
        await tx.pet.update({
          where: { id: existing.petId },
          data: { ownerId: adopter.applicantId, custodianOrgId: null },
        });

        await tx.adoptionApplication.update({
          where: { id: adopter.applicationId },
          data: { status: "APPROVED", decidedAt: new Date() },
        });

        // Everyone else who applied deserves to hear, rather than being left
        // watching a listing that quietly vanished.
        const others = await tx.adoptionApplication.findMany({
          where: {
            listingId: id,
            id: { not: adopter.applicationId },
            status: { in: ["SUBMITTED", "IN_REVIEW"] },
          },
          select: { id: true, applicantId: true },
        });

        await tx.adoptionApplication.updateMany({
          where: { id: { in: others.map((application) => application.id) } },
          data: { status: "REJECTED", decidedAt: new Date() },
        });

        await notify(tx, {
          userId: adopter.applicantId,
          type: "ADOPTION",
          title: `${existing.pet.name} é seu! 🎉`,
          body: "Sua adoção foi confirmada. Combine a retirada com o abrigo.",
          href: "/meus-pets",
        });

        for (const application of others) {
          await notify(tx, {
            userId: application.applicantId,
            type: "ADOPTION",
            title: `${existing.pet.name} foi adotado`,
            body: "Desta vez não deu — mas há outros esperando por uma família.",
            href: "/adocao",
          });
        }
      }

      return listing;
    });
  }

  /** The approved applicant this adoption goes to. */
  private async resolveAdopter(listingId: string, applicationId: string | null | undefined) {
    if (!applicationId) {
      throw new InvalidInputError("Escolha a candidatura aprovada antes de marcar como adotado.");
    }

    const application = await this.deps.db.adoptionApplication.findFirst({
      where: { id: applicationId, listingId },
      select: { id: true, applicantId: true },
    });

    if (!application) {
      throw new NotFoundError("Candidatura não encontrada para este anúncio.");
    }

    return { applicationId: application.id, applicantId: application.applicantId };
  }
}

export interface ListApplicationsCommand extends OrganizationCommand {
  listingId?: string;
}

export class ListApplicationsUseCase implements UseCase<ListApplicationsCommand, ApplicationDTO[]> {
  constructor(private readonly deps: ListingDeps) {}

  execute({ organizationId, listingId }: ListApplicationsCommand): Promise<ApplicationDTO[]> {
    return this.deps.db.adoptionApplication.findMany({
      // Scoped through the listing's organization, so an application id from
      // another shelter simply is not in the result set.
      where: { listing: { orgId: organizationId, ...(listingId ? { id: listingId } : {}) } },
      select: applicationSelect,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }
}

export type DecideApplicationCommand = OrganizationCommand & DecideApplicationInput;

/**
 * Moves an application along without concluding the adoption.
 *
 * APPROVED here means "we want this person" — the animal only changes hands
 * when the listing is set to ADOPTED, which is a deliberate second step: a
 * shelter approves an application before the home visit, not after it.
 */
export class DecideApplicationUseCase implements UseCase<DecideApplicationCommand, ApplicationDTO> {
  constructor(private readonly deps: ListingDeps) {}

  async execute({
    organizationId,
    applicationId,
    status,
  }: DecideApplicationCommand): Promise<ApplicationDTO> {
    const existing = await this.deps.db.adoptionApplication.findFirst({
      where: { id: applicationId, listing: { orgId: organizationId } },
      select: {
        id: true,
        status: true,
        applicantId: true,
        listing: { select: { id: true, pet: { select: { name: true } } } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Candidatura não encontrada.");
    }

    if (existing.status === "WITHDRAWN") {
      throw new InvalidInputError("Esta candidatura foi retirada pelo candidato.");
    }

    return withTransaction(this.deps.db, async (tx) => {
      const application = await tx.adoptionApplication.update({
        where: { id: applicationId },
        data: {
          status,
          decidedAt: status === "IN_REVIEW" ? null : new Date(),
        },
        select: applicationSelect,
      });

      const petName = existing.listing.pet.name;

      const message =
        status === "IN_REVIEW"
          ? {
              title: `Sua candidatura para ${petName} está em análise`,
              body: "O abrigo está avaliando.",
            }
          : status === "APPROVED"
            ? { title: `Boa notícia sobre ${petName}! 💚`, body: "Sua candidatura foi aprovada." }
            : {
                title: `Sobre sua candidatura para ${petName}`,
                body: "Desta vez não foi possível.",
              };

      await notify(tx, {
        userId: existing.applicantId,
        type: "ADOPTION",
        title: message.title,
        body: message.body,
        href: `/pet/${existing.listing.id}`,
      });

      return application;
    });
  }
}
