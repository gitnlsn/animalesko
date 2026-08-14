import { describe } from "vitest";

import {
  ListAnimalsUseCase,
  UpdateAnimalUseCase,
} from "../../../src/use-cases/animal/animal.use-cases.ts";
import {
  CreateHealthRecordUseCase,
  CreateVaccinationUseCase,
  ListDueVaccinationsUseCase,
  ListHealthRecordsUseCase,
  ListVaccinationsUseCase,
} from "../../../src/use-cases/clinical/clinical.use-cases.ts";
import { NotFoundError } from "../../../src/use-cases/errors.ts";
import { vaccinationStatus } from "../../../src/schemas/clinical.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

/** A pet the org has seen, but does not own — the "patient" relationship. */
async function seedPatient(db: TestDb, organizationId: string) {
  const { user: tutor } = await createUserSession(db);
  const pet = await db.pet.create({ data: { name: "Rex", species: "DOG", ownerId: tutor.id } });

  await db.appointment.create({
    data: {
      orgId: organizationId,
      petId: pet.id,
      tutorId: tutor.id,
      serviceLabel: "Consulta",
      scheduledAt: new Date(),
    },
  });

  return { tutor, pet };
}

describe.concurrent("animal scope", () => {
  test("lists custody animals and patients, tagged by relationship", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);

    const custody = await db.pet.create({
      data: { name: "Luna", species: "DOG", custodianOrgId: org.id },
    });
    const { pet: patient } = await seedPatient(db, org.id);

    const animals = await new ListAnimalsUseCase({ db }).execute({
      organizationId: org.id,
      limit: 100,
    });

    const byId = new Map(animals.map((animal) => [animal.id, animal]));

    expect(byId.get(custody.id)?.relation).toBe("CUSTODY");
    expect(byId.get(patient.id)?.relation).toBe("PATIENT");
    expect(animals).toHaveLength(2);
  });

  test("excludes animals of other organizations", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);

    await db.pet.create({ data: { name: "Alheio", species: "CAT", custodianOrgId: other.id } });

    const animals = await new ListAnimalsUseCase({ db }).execute({
      organizationId: org.id,
      limit: 100,
    });

    expect(animals).toHaveLength(0);
  });

  test("refuses to edit a patient the organization does not hold", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { pet } = await seedPatient(db, org.id);

    // A clinic may record what it found, but must not rename someone else's dog.
    await expect(
      new UpdateAnimalUseCase({ db }).execute({
        organizationId: org.id,
        id: pet.id,
        name: "Renomeado",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("health records", () => {
  test("are readable for a patient and carry the author", async ({ db, expect }) => {
    const { org, user: staff } = await createProviderSession(db);
    const { pet } = await seedPatient(db, org.id);

    await new CreateHealthRecordUseCase({ db }).execute({
      organizationId: org.id,
      actorId: staff.id,
      data: {
        petId: pet.id,
        recordedAt: new Date(),
        weightKg: 26.5,
        temperatureC: 38.5,
        symptoms: "Apatia leve.",
      },
    });

    const records = await new ListHealthRecordsUseCase({ db }).execute({
      organizationId: org.id,
      petId: pet.id,
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.author?.id).toBe(staff.id);
    // Decimal narrowed to a number, or it cannot cross the RSC boundary.
    expect(records[0]?.weightKg).toBe(26.5);
    expect(typeof records[0]?.weightKg).toBe("number");
  });

  test("a recorded weight updates the animal's current weight", async ({ db, expect }) => {
    const { org, user: staff } = await createProviderSession(db);
    const { pet } = await seedPatient(db, org.id);

    await new CreateHealthRecordUseCase({ db }).execute({
      organizationId: org.id,
      actorId: staff.id,
      data: { petId: pet.id, recordedAt: new Date(), weightKg: 30 },
    });

    const updated = await db.pet.findUniqueOrThrow({ where: { id: pet.id } });
    expect(Number(updated.weightKg)).toBe(30);
  });

  test("show every clinic's notes, not only the caller's", async ({ db, expect }) => {
    const { org: first, user: firstStaff } = await createProviderSession(db);
    const { org: second, user: secondStaff } = await createProviderSession(db);
    const { pet } = await seedPatient(db, first.id);

    // The same animal also seen by a second clinic.
    await db.appointment.create({
      data: {
        orgId: second.id,
        petId: pet.id,
        serviceLabel: "Segunda opinião",
        scheduledAt: new Date(),
      },
    });

    const create = new CreateHealthRecordUseCase({ db });
    await create.execute({
      organizationId: first.id,
      actorId: firstStaff.id,
      data: { petId: pet.id, recordedAt: new Date(), notes: "Febre." },
    });
    await create.execute({
      organizationId: second.id,
      actorId: secondStaff.id,
      data: { petId: pet.id, recordedAt: new Date(), notes: "Melhorou." },
    });

    // A vet needs to see that another clinic recorded a fever last week.
    const records = await new ListHealthRecordsUseCase({ db }).execute({
      organizationId: second.id,
      petId: pet.id,
    });

    expect(records).toHaveLength(2);
  });

  test("refuse an animal the organization has never seen", async ({ db, expect }) => {
    const { org, user: staff } = await createProviderSession(db);
    const { user: stranger } = await createUserSession(db);
    const pet = await db.pet.create({
      data: { name: "Desconhecido", species: "CAT", ownerId: stranger.id },
    });

    await expect(
      new CreateHealthRecordUseCase({ db }).execute({
        organizationId: org.id,
        actorId: staff.id,
        data: { petId: pet.id, recordedAt: new Date(), notes: "..." },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("vaccinations", () => {
  test("record a dose and its booster", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { pet } = await seedPatient(db, org.id);

    await new CreateVaccinationUseCase({ db }).execute({
      organizationId: org.id,
      data: {
        petId: pet.id,
        name: "Antirrábica",
        appliedAt: new Date(Date.now() - 86_400_000),
        nextDoseAt: new Date(Date.now() + 365 * 86_400_000),
      },
    });

    const doses = await new ListVaccinationsUseCase({ db }).execute({
      organizationId: org.id,
      petId: pet.id,
    });

    expect(doses).toHaveLength(1);
    expect(doses[0]?.name).toBe("Antirrábica");
  });

  test("surface boosters coming due for animals in custody", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);

    const held = await db.pet.create({
      data: { name: "Luna", species: "DOG", custodianOrgId: org.id },
    });

    const create = new CreateVaccinationUseCase({ db });

    await create.execute({
      organizationId: org.id,
      data: {
        petId: held.id,
        name: "V10",
        appliedAt: new Date(Date.now() - 90 * 86_400_000),
        nextDoseAt: new Date(Date.now() + 5 * 86_400_000),
      },
    });

    await create.execute({
      organizationId: org.id,
      data: {
        petId: held.id,
        name: "Giárdia",
        appliedAt: new Date(Date.now() - 10 * 86_400_000),
        nextDoseAt: new Date(Date.now() + 300 * 86_400_000),
      },
    });

    const due = await new ListDueVaccinationsUseCase({ db }).execute({
      organizationId: org.id,
      withinDays: 30,
    });

    // Replaces the dashboard's invented "Ração acabará em 3 dias".
    expect(due.map((row) => row.name)).toEqual(["V10"]);
    expect(due[0]?.daysUntilDue).toBeLessThanOrEqual(5);
  });
});

describe.concurrent("vaccinationStatus", () => {
  test("derives from the booster date rather than a stored column", ({ expect }) => {
    const now = new Date("2026-01-01T12:00:00Z");

    expect(vaccinationStatus(null, now)).toBe("SEM_REFORCO");
    expect(vaccinationStatus(new Date("2025-12-01T12:00:00Z"), now)).toBe("ATRASADA");
    expect(vaccinationStatus(new Date("2026-01-15T12:00:00Z"), now)).toBe("PROXIMA");
    expect(vaccinationStatus(new Date("2026-06-01T12:00:00Z"), now)).toBe("EM_DIA");
  });
});
