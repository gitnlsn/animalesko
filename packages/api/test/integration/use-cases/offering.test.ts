import { describe } from "vitest";

import { NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  CreateOfferingUseCase,
  DeleteOfferingUseCase,
  ListOfferingsUseCase,
  UpdateOfferingUseCase,
} from "../../../src/use-cases/offering/index.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, type TestDb } from "../helpers.ts";

import type { CreateOfferingInput } from "../../../src/schemas/offering.ts";

function useCases(db: TestDb) {
  return {
    list: new ListOfferingsUseCase({ db }),
    create: new CreateOfferingUseCase({ db }),
    update: new UpdateOfferingUseCase({ db }),
    remove: new DeleteOfferingUseCase({ db }),
  };
}

function offeringData(overrides: Partial<CreateOfferingInput> = {}): CreateOfferingInput {
  return {
    type: "DOG_WALKER",
    title: "Passeio matinal",
    priceCents: 2500,
    priceUnit: "PER_WALK",
    tags: [],
    isActive: true,
    ...overrides,
  } as CreateOfferingInput;
}

describe.concurrent("offering use cases", () => {
  test("stores the offering against the organization it was created for", async ({
    db,
    expect,
  }) => {
    const provider = await createProviderSession(db);
    const { create } = useCases(db);

    const offering = await create.execute({
      organizationId: provider.org.id,
      data: offeringData({ description: "Passeios diários.", priceCents: 4500 }),
    });

    expect(offering.orgId).toBe(provider.org.id);
    expect(offering.priceCents).toBe(4500);
    expect(offering.currency).toBe("BRL");
  });

  test("lists only the caller organization's offerings", async ({ db, expect }) => {
    const first = await createProviderSession(db);
    const second = await createProviderSession(db);
    const { create, list } = useCases(db);

    await create.execute({ organizationId: first.org.id, data: offeringData() });

    expect(await list.execute({ organizationId: first.org.id })).toHaveLength(1);
    expect(await list.execute({ organizationId: second.org.id })).toHaveLength(0);
  });

  test("refuses to update another organization's offering", async ({ db, expect }) => {
    const owner = await createProviderSession(db);
    const stranger = await createProviderSession(db);
    const { create, update } = useCases(db);

    const offering = await create.execute({
      organizationId: owner.org.id,
      data: offeringData({ priceCents: 4500 }),
    });

    await expect(
      update.execute({
        organizationId: stranger.org.id,
        offeringId: offering.id,
        data: { priceCents: 1 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    // The scoping must prevent the write, not merely report it afterwards.
    const stored = await db.serviceOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(stored.priceCents).toBe(4500);
  });

  test("refuses to delete another organization's offering", async ({ db, expect }) => {
    const owner = await createProviderSession(db);
    const stranger = await createProviderSession(db);
    const { create, remove } = useCases(db);

    const offering = await create.execute({
      organizationId: owner.org.id,
      data: offeringData(),
    });

    await expect(
      remove.execute({ organizationId: stranger.org.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await db.serviceOffering.findUnique({ where: { id: offering.id } })).not.toBeNull();
  });

  test("applies the owner's own update and returns the fresh row", async ({ db, expect }) => {
    const provider = await createProviderSession(db);
    const { create, update } = useCases(db);
    const offering = await create.execute({
      organizationId: provider.org.id,
      data: offeringData(),
    });

    const updated = await update.execute({
      organizationId: provider.org.id,
      offeringId: offering.id,
      data: { isActive: false, priceCents: 3000 },
    });

    expect(updated).toMatchObject({ isActive: false, priceCents: 3000 });
  });

  test("raises NotFoundError for an id that never existed", async ({ db, expect }) => {
    const provider = await createProviderSession(db);
    const { remove } = useCases(db);

    await expect(
      remove.execute({ organizationId: provider.org.id, offeringId: "cmaaaaaaaaaaaaaaaaaaaaaaa" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
