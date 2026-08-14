import { describe } from "vitest";

import { test } from "./db-fixture.ts";
import { appCaller, createProviderSession, createUserSession, plusCaller } from "./helpers.ts";

describe.concurrent("offering router (provider surface)", () => {
  test("refuses callers with no organization", async ({ db, expect }) => {
    const { session } = await createUserSession(db);

    await expect(plusCaller(db, session).offering.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("scopes offerings to the caller's organization", async ({ db, expect }) => {
    const first = await createProviderSession(db);
    const second = await createProviderSession(db);

    await plusCaller(db, first.session).offering.create({
      type: "DOG_WALKER",
      title: "Passeio matinal",
      priceCents: 2500,
      priceUnit: "PER_WALK",
      tags: ["Matutino"],
      isActive: true,
    });

    expect(await plusCaller(db, first.session).offering.list()).toHaveLength(1);
    expect(await plusCaller(db, second.session).offering.list()).toHaveLength(0);
  });

  test("cannot update or delete another organization's offering", async ({ db, expect }) => {
    const owner = await createProviderSession(db);
    const stranger = await createProviderSession(db);

    const offering = await plusCaller(db, owner.session).offering.create({
      type: "PET_SITTER",
      title: "Diária",
      priceCents: 4500,
      priceUnit: "PER_DAY",
      tags: [],
      isActive: true,
    });

    await expect(
      plusCaller(db, stranger.session).offering.update({ id: offering.id, priceCents: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      plusCaller(db, stranger.session).offering.delete({ id: offering.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const untouched = await db.serviceOffering.findUniqueOrThrow({
      where: { id: offering.id },
    });
    expect(untouched.priceCents).toBe(4500);
  });

  test("publishes to the consumer catalog — the provider/consumer seam", async ({ db, expect }) => {
    const provider = await createProviderSession(db);
    const city = `Cidade ${crypto.randomUUID()}`;
    await db.organization.update({ where: { id: provider.org.id }, data: { city } });

    const offering = await plusCaller(db, provider.session).offering.create({
      type: "DOG_WALKER",
      title: "Passeio vespertino",
      description: "Passeios diários.",
      priceCents: 2500,
      priceUnit: "PER_WALK",
      tags: ["Vespertino"],
      isActive: true,
    });

    // Anonymous consumer sees it without a session.
    const visible = await appCaller(db, null).catalog.offerings({ city, limit: 20 });
    expect(visible.map((item) => item.id)).toContain(offering.id);
    expect(visible[0]?.org.name).toBe(provider.org.name);

    // Deactivating in `plus` removes it from `app`.
    await plusCaller(db, provider.session).offering.update({ id: offering.id, isActive: false });

    const afterHiding = await appCaller(db, null).catalog.offerings({ city, limit: 20 });
    expect(afterHiding.map((item) => item.id)).not.toContain(offering.id);
  });
});
