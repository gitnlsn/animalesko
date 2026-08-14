import { describe } from "vitest";

import { ConflictError, InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  CreateListingUseCase,
  DecideApplicationUseCase,
  ListApplicationsUseCase,
  ListListingsUseCase,
  SetListingStatusUseCase,
  UpdateListingUseCase,
} from "../../../src/use-cases/listing/listing.use-cases.ts";
import { BrowseListingsUseCase } from "../../../src/use-cases/catalog/browse-listings.use-case.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

async function seedCustodyAnimal(db: TestDb, organizationId: string, name = "Luna") {
  return db.pet.create({
    data: { name, species: "DOG", custodianOrgId: organizationId },
  });
}

function listingData(petId: string) {
  return {
    petId,
    summary: "Luna é carinhosa e brincalhona.",
    urgency: "READY" as const,
    city: "São Paulo",
    state: "SP",
    photoUrls: [],
  };
}

async function seedApplication(db: TestDb, listingId: string) {
  const { user } = await createUserSession(db);

  const application = await db.adoptionApplication.create({
    data: { listingId, applicantId: user.id, message: "Tenho quintal grande." },
    select: { id: true },
  });

  return { applicant: user, applicationId: application.id };
}

describe.concurrent("CreateListingUseCase", () => {
  test("starts as a draft, invisible to the consumer feed", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    expect(listing.status).toBe("DRAFT");
    expect(listing.publishedAt).toBeNull();

    // The consumer feed only ever shows AVAILABLE.
    const feed = await new BrowseListingsUseCase({ db }).execute({ limit: 50 });
    expect(feed.map((row) => row.id)).not.toContain(listing.id);
  });

  test("refuses an animal not in this organization's custody", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, other.id);

    await expect(
      new CreateListingUseCase({ db }).execute({
        organizationId: org.id,
        data: listingData(pet.id),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("allows only one listing per animal", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);
    const useCase = new CreateListingUseCase({ db });

    await useCase.execute({ organizationId: org.id, data: listingData(pet.id) });

    await expect(
      useCase.execute({ organizationId: org.id, data: listingData(pet.id) }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe.concurrent("SetListingStatusUseCase", () => {
  test("publishing puts the animal in the consumer feed", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    await new SetListingStatusUseCase({ db }).execute({
      organizationId: org.id,
      id: listing.id,
      status: "AVAILABLE",
    });

    // This is the whole point of the screen: until now only `pnpm db:seed`
    // could put a pet in front of a tutor.
    const feed = await new BrowseListingsUseCase({ db }).execute({ limit: 50 });
    expect(feed.map((row) => row.id)).toContain(listing.id);
  });

  test("adopting transfers the animal and closes the other applications", async ({
    db,
    expect,
  }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    const status = new SetListingStatusUseCase({ db });
    await status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" });

    const chosen = await seedApplication(db, listing.id);
    const rejected = await seedApplication(db, listing.id);

    await status.execute({
      organizationId: org.id,
      id: listing.id,
      status: "ADOPTED",
      adopterApplicationId: chosen.applicationId,
    });

    // The adoption itself. Leaving either half undone would strand the animal
    // owned by nobody, or still on the shelter's books.
    const adopted = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(adopted.ownerId).toBe(chosen.applicant.id);
    expect(adopted.custodianOrgId).toBeNull();

    const applications = await db.adoptionApplication.findMany({
      where: { listingId: listing.id },
      select: { id: true, status: true },
    });

    expect(applications.find((a) => a.id === chosen.applicationId)?.status).toBe("APPROVED");
    expect(applications.find((a) => a.id === rejected.applicationId)?.status).toBe("REJECTED");

    // Everyone hears, rather than watching a listing quietly vanish.
    expect(await db.notification.count({ where: { userId: chosen.applicant.id } })).toBe(1);
    expect(await db.notification.count({ where: { userId: rejected.applicant.id } })).toBe(1);

    const feed = await new BrowseListingsUseCase({ db }).execute({ limit: 50 });
    expect(feed.map((row) => row.id)).not.toContain(listing.id);
  });

  test("refuses ADOPTED without naming the adopter", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    const status = new SetListingStatusUseCase({ db });
    await status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" });

    await expect(
      status.execute({ organizationId: org.id, id: listing.id, status: "ADOPTED" }),
    ).rejects.toBeInstanceOf(InvalidInputError);

    // Nothing moved.
    const untouched = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(untouched.ownerId).toBeNull();
    expect(untouched.custodianOrgId).toBe(org.id);
  });

  test("refuses an applicant from a different listing", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const mine = await seedCustodyAnimal(db, org.id, "Luna");
    const other = await seedCustodyAnimal(db, org.id, "Bidu");
    const create = new CreateListingUseCase({ db });

    const listing = await create.execute({ organizationId: org.id, data: listingData(mine.id) });
    const decoy = await create.execute({ organizationId: org.id, data: listingData(other.id) });

    const status = new SetListingStatusUseCase({ db });
    await status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" });

    const elsewhere = await seedApplication(db, decoy.id);

    await expect(
      status.execute({
        organizationId: org.id,
        id: listing.id,
        status: "ADOPTED",
        adopterApplicationId: elsewhere.applicationId,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("ADOPTED is terminal", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    const status = new SetListingStatusUseCase({ db });
    await status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" });

    const chosen = await seedApplication(db, listing.id);
    await status.execute({
      organizationId: org.id,
      id: listing.id,
      status: "ADOPTED",
      adopterApplicationId: chosen.applicationId,
    });

    await expect(
      status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  test("RESERVED takes the animal off the feed without ending the story", async ({
    db,
    expect,
  }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    const status = new SetListingStatusUseCase({ db });
    await status.execute({ organizationId: org.id, id: listing.id, status: "AVAILABLE" });
    await status.execute({ organizationId: org.id, id: listing.id, status: "RESERVED" });

    const feed = await new BrowseListingsUseCase({ db }).execute({ limit: 50 });
    expect(feed.map((row) => row.id)).not.toContain(listing.id);

    // Still recoverable — the animal keeps its custody and can go back up.
    const held = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(held.custodianOrgId).toBe(org.id);

    const back = await status.execute({
      organizationId: org.id,
      id: listing.id,
      status: "AVAILABLE",
    });
    expect(back.status).toBe("AVAILABLE");
  });
});

describe.concurrent("applications", () => {
  test("are scoped to the organization's own listings", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    await seedApplication(db, listing.id);

    const useCase = new ListApplicationsUseCase({ db });

    expect(await useCase.execute({ organizationId: org.id })).toHaveLength(1);
    expect(await useCase.execute({ organizationId: other.id })).toHaveLength(0);
  });

  test("deciding notifies the applicant without moving the animal", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: listingData(pet.id),
    });

    const { applicant, applicationId } = await seedApplication(db, listing.id);

    const decided = await new DecideApplicationUseCase({ db }).execute({
      organizationId: org.id,
      applicationId,
      status: "APPROVED",
    });

    expect(decided.status).toBe("APPROVED");
    expect(await db.notification.count({ where: { userId: applicant.id } })).toBe(1);

    // Approving is not adopting: the animal changes hands only at ADOPTED, so a
    // shelter can approve before the home visit.
    const stillHere = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(stillHere.ownerId).toBeNull();
  });
});

describe.concurrent("UpdateListingUseCase", () => {
  test("replaces the photo set wholesale", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const pet = await seedCustodyAnimal(db, org.id);

    const listing = await new CreateListingUseCase({ db }).execute({
      organizationId: org.id,
      data: {
        ...listingData(pet.id),
        photoUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      },
    });

    expect(listing.photos).toHaveLength(2);

    const updated = await new UpdateListingUseCase({ db }).execute({
      organizationId: org.id,
      id: listing.id,
      photoUrls: ["https://example.com/c.jpg"],
    });

    expect(updated.photos.map((photo) => photo.url)).toEqual(["https://example.com/c.jpg"]);
  });
});

describe.concurrent("ListListingsUseCase", () => {
  test("returns only this organization's listings", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);
    const create = new CreateListingUseCase({ db });

    const mine = await create.execute({
      organizationId: org.id,
      data: listingData((await seedCustodyAnimal(db, org.id)).id),
    });
    await create.execute({
      organizationId: other.id,
      data: listingData((await seedCustodyAnimal(db, other.id)).id),
    });

    const listings = await new ListListingsUseCase({ db }).execute({
      organizationId: org.id,
      limit: 50,
    });

    expect(listings.map((row) => row.id)).toEqual([mine.id]);
  });
});
