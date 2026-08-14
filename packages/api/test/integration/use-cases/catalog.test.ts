import { describe } from "vitest";

import {
  BrowseListingsUseCase,
  BrowseOfferingsUseCase,
} from "../../../src/use-cases/catalog/index.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, type TestDb } from "../helpers.ts";

/**
 * The catalog use cases read globally — they have no actor to scope by, which
 * is the point: the browse surface must render for anonymous visitors.
 *
 * Inside a rolled-back transaction a global read sees committed rows plus this
 * test's own, and since nothing in the suite ever commits, that is just this
 * test's own rows. The offering tests additionally filter by a `city` unique to
 * the test, so they would hold even if the database were not empty.
 */
async function providerInOwnCity(db: TestDb) {
  const provider = await createProviderSession(db);
  const city = `Cidade ${crypto.randomUUID()}`;

  await db.organization.update({ where: { id: provider.org.id }, data: { city } });

  return { ...provider, city };
}

describe.concurrent("catalog use cases", () => {
  test("shows active offerings and hides deactivated ones", async ({ db, expect }) => {
    const { org, city } = await providerInOwnCity(db);

    await db.serviceOffering.create({
      data: {
        orgId: org.id,
        type: "DOG_WALKER",
        title: "Visível",
        priceCents: 2500,
        priceUnit: "PER_WALK",
      },
    });
    await db.serviceOffering.create({
      data: {
        orgId: org.id,
        type: "GROOMING",
        title: "Oculto",
        priceCents: 8900,
        priceUnit: "PER_SESSION",
        isActive: false,
      },
    });

    const result = await new BrowseOfferingsUseCase({ db }).execute({ city, limit: 20 });

    // The provider/consumer seam: deactivating in `plus` withdraws from `app`.
    expect(result.map((item) => item.title)).toEqual(["Visível"]);
    expect(result[0]?.org.name).toBe(org.name);
  });

  test("filters offerings by type", async ({ db, expect }) => {
    const { org, city } = await providerInOwnCity(db);

    for (const [type, title] of [
      ["DOG_WALKER", "Passeio"],
      ["GROOMING", "Banho"],
    ] as const) {
      await db.serviceOffering.create({
        data: { orgId: org.id, type, title, priceCents: 1000, priceUnit: "PER_SESSION" },
      });
    }

    const result = await new BrowseOfferingsUseCase({ db }).execute({
      city,
      type: "GROOMING",
      limit: 20,
    });

    expect(result.map((item) => item.title)).toEqual(["Banho"]);
  });

  test("publishes only AVAILABLE listings", async ({ db, expect }) => {
    const shelter = await createProviderSession(db);

    for (const [name, status] of [
      ["Luna", "AVAILABLE"],
      ["Rascunho", "DRAFT"],
      ["Adotado", "ADOPTED"],
    ] as const) {
      const pet = await db.pet.create({
        data: { name, species: "DOG", custodianOrgId: shelter.org.id },
      });
      await db.adoptionListing.create({
        data: {
          petId: pet.id,
          orgId: shelter.org.id,
          status,
          summary: `${name} procura um lar`,
          city: "São Paulo",
          state: "SP",
          publishedAt: new Date(),
        },
      });
    }

    const all = await new BrowseListingsUseCase({ db }).execute({ limit: 50 });
    // `browseListings` takes no city filter, so scope the assertion to the rows
    // this test created rather than assuming it owns the whole table.
    const mine = all.filter((listing) => listing.org.id === shelter.org.id);

    expect(mine).toHaveLength(1);
    expect(mine[0]?.pet.name).toBe("Luna");
  });

  test("filters listings by species and state", async ({ db, expect }) => {
    const shelter = await createProviderSession(db);

    for (const [name, species, state] of [
      ["Cão SP", "DOG", "SP"],
      ["Gato SP", "CAT", "SP"],
      ["Cão RJ", "DOG", "RJ"],
    ] as const) {
      const pet = await db.pet.create({
        data: { name, species, custodianOrgId: shelter.org.id },
      });
      await db.adoptionListing.create({
        data: {
          petId: pet.id,
          orgId: shelter.org.id,
          status: "AVAILABLE",
          summary: name,
          city: "Cidade",
          state,
          publishedAt: new Date(),
        },
      });
    }

    // The filter reaches through the listing into the related pet.
    const all = await new BrowseListingsUseCase({ db }).execute({
      species: "DOG",
      state: "SP",
      limit: 50,
    });
    const mine = all.filter((listing) => listing.org.id === shelter.org.id);

    expect(mine.map((listing) => listing.pet.name)).toEqual(["Cão SP"]);
  });

  test("needs no actor — the browse surface must render for anonymous visitors", async ({
    db,
    expect,
  }) => {
    // No session is constructed anywhere in this test; the use cases take none.
    await expect(
      new BrowseOfferingsUseCase({ db }).execute({
        city: `Vazia ${crypto.randomUUID()}`,
        limit: 20,
      }),
    ).resolves.toEqual([]);

    await expect(
      new BrowseListingsUseCase({ db }).execute({ state: "AC", limit: 20 }),
    ).resolves.toEqual([]);
  });
});
