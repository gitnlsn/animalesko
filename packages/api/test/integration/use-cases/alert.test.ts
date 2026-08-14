import { describe } from "vitest";

import { InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import {
  CreateAlertUseCase,
  ListAlertsUseCase,
  ReportSightingUseCase,
  ResolveAlertUseCase,
} from "../../../src/use-cases/alert/alert.use-cases.ts";
import { POINTS } from "../../../src/schemas/gamification.ts";
import { test } from "../db-fixture.ts";
import { createUserSession, type TestDb } from "../helpers.ts";

import type { CreateAlertInput } from "../../../src/schemas/alert.ts";

/** Central São Paulo, matching the seed. */
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

function alertData(overrides: Partial<CreateAlertInput> = {}): CreateAlertInput {
  return {
    name: "Pretinha",
    species: "DOG",
    description: "Cadela preta de porte médio, coleira vermelha.",
    lastSeenLat: SAO_PAULO.latitude,
    lastSeenLng: SAO_PAULO.longitude,
    lastSeenAddress: "Av. Paulista",
    lastSeenAt: new Date(Date.now() - 86_400_000),
    contactName: "Ana Souza",
    contactPhone: "(11) 98888-1234",
    photoUrls: [],
    ...overrides,
  } as CreateAlertInput;
}

async function fileAlert(
  db: TestDb,
  reporterId: string,
  overrides: Partial<CreateAlertInput> = {},
) {
  return new CreateAlertUseCase({ db }).execute({
    actorId: reporterId,
    data: alertData(overrides),
  });
}

describe.concurrent("CreateAlertUseCase", () => {
  test("files the alert with its photos", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    const alert = await fileAlert(db, user.id, {
      photoUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });

    expect(alert.status).toBe("LOST");
    expect(alert.photos.map((photo) => photo.url)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
    expect(alert.reporter.id).toBe(user.id);
  });

  test("attaches one of the reporter's own pets", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const pet = await db.pet.create({ data: { name: "Rex", species: "DOG", ownerId: user.id } });

    const alert = await fileAlert(db, user.id, { petId: pet.id });

    expect(alert.pet?.id).toBe(pet.id);
  });

  test("refuses a pet belonging to somebody else", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const pet = await db.pet.create({
      data: { name: "Rex", species: "DOG", ownerId: stranger.id },
    });

    await expect(fileAlert(db, user.id, { petId: pet.id })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("ListAlertsUseCase", () => {
  test("filters to a bounding box around a point", async ({ db, expect }) => {
    const { user } = await createUserSession(db);

    const near = await fileAlert(db, user.id, { name: "Perto" });
    // Manaus — roughly 2,700 km away, comfortably outside any allowed radius.
    await fileAlert(db, user.id, { name: "Longe", lastSeenLat: -3.119, lastSeenLng: -60.0217 });

    const results = await new ListAlertsUseCase({ db }).execute({
      near: { ...SAO_PAULO, radiusKm: 50 },
      limit: 50,
    });

    const ids = results.map((alert) => alert.id);
    expect(ids).toContain(near.id);
    expect(results.every((alert) => alert.name !== "Longe")).toBe(true);
  });

  test("hides resolved alerts from the default board", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const alert = await fileAlert(db, user.id);

    await new ResolveAlertUseCase({ db }).execute({
      actorId: user.id,
      id: alert.id,
      status: "RESOLVED",
    });

    const board = await new ListAlertsUseCase({ db }).execute({ limit: 50 });
    expect(board.map((row) => row.id)).not.toContain(alert.id);

    const explicit = await new ListAlertsUseCase({ db }).execute({
      status: "RESOLVED",
      limit: 50,
    });
    expect(explicit.map((row) => row.id)).toContain(alert.id);
  });
});

describe.concurrent("ReportSightingUseCase", () => {
  test("notifies the reporter and awards the finder", async ({ db, expect }) => {
    const { user: owner } = await createUserSession(db);
    const { user: finder } = await createUserSession(db);
    const alert = await fileAlert(db, owner.id);

    const result = await new ReportSightingUseCase({ db }).execute({
      actorId: finder.id,
      alertId: alert.id,
      latitude: SAO_PAULO.latitude,
      longitude: SAO_PAULO.longitude,
      address: "Rua Augusta",
      sightedAt: new Date(),
    });

    expect(result.sightings).toBe(1);

    // Telling the owner is the entire point of the board; the prototype's
    // localStorage version could not do this at all.
    const notifications = await db.notification.findMany({ where: { userId: owner.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("ALERT");

    const profile = await db.gamificationProfile.findUniqueOrThrow({
      where: { userId: finder.id },
    });
    expect(profile.points).toBe(POINTS.ALERT_SIGHTING);
  });

  test("does not notify you about your own sighting", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const alert = await fileAlert(db, user.id);

    await new ReportSightingUseCase({ db }).execute({
      actorId: user.id,
      alertId: alert.id,
      latitude: SAO_PAULO.latitude,
      longitude: SAO_PAULO.longitude,
      sightedAt: new Date(),
    });

    const notifications = await db.notification.count({ where: { userId: user.id } });
    expect(notifications).toBe(0);
  });

  test("pays out once per alert however many sightings are reported", async ({ db, expect }) => {
    const { user: owner } = await createUserSession(db);
    const { user: finder } = await createUserSession(db);
    const alert = await fileAlert(db, owner.id);
    const useCase = new ReportSightingUseCase({ db });

    for (let index = 0; index < 3; index += 1) {
      await useCase.execute({
        actorId: finder.id,
        alertId: alert.id,
        latitude: SAO_PAULO.latitude,
        longitude: SAO_PAULO.longitude,
        sightedAt: new Date(),
      });
    }

    const profile = await db.gamificationProfile.findUniqueOrThrow({
      where: { userId: finder.id },
    });
    expect(profile.points).toBe(POINTS.ALERT_SIGHTING);
  });

  test("refuses a sighting on a closed alert", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: finder } = await createUserSession(db);
    const alert = await fileAlert(db, user.id);

    await new ResolveAlertUseCase({ db }).execute({
      actorId: user.id,
      id: alert.id,
      status: "RESOLVED",
    });

    await expect(
      new ReportSightingUseCase({ db }).execute({
        actorId: finder.id,
        alertId: alert.id,
        latitude: SAO_PAULO.latitude,
        longitude: SAO_PAULO.longitude,
        sightedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe.concurrent("ResolveAlertUseCase", () => {
  test("lets only the reporter close their alert", async ({ db, expect }) => {
    const { user } = await createUserSession(db);
    const { user: stranger } = await createUserSession(db);
    const alert = await fileAlert(db, user.id);

    await expect(
      new ResolveAlertUseCase({ db }).execute({
        actorId: stranger.id,
        id: alert.id,
        status: "FOUND",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
