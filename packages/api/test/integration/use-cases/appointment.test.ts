import { describe } from "vitest";

import {
  CreateAppointmentUseCase,
  ListAppointmentsUseCase,
  SetAppointmentStatusUseCase,
  UpdateAppointmentUseCase,
} from "../../../src/use-cases/appointment/appointment.use-cases.ts";
import { ConflictError, InvalidInputError, NotFoundError } from "../../../src/use-cases/errors.ts";
import { test } from "../db-fixture.ts";
import { createProviderSession, createUserSession, type TestDb } from "../helpers.ts";

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

function appointmentData(overrides: Record<string, unknown> = {}) {
  return {
    serviceLabel: "Consulta Veterinária",
    scheduledAt: inDays(1),
    durationMinutes: 30,
    newClient: { name: "Ana Souza", phone: "(11) 98888-1234" },
    ...overrides,
  } as Parameters<CreateAppointmentUseCase["execute"]>[0]["data"];
}

/** A consumer booking and the appointment it created, as the app would. */
async function seedBookingWithAppointment(db: TestDb) {
  const { user: tutor } = await createUserSession(db);
  const { org } = await createProviderSession(db);

  const offering = await db.serviceOffering.create({
    data: {
      orgId: org.id,
      type: "DOG_WALKER",
      title: "Dog Walker",
      priceCents: 2500,
      priceUnit: "PER_WALK",
    },
  });

  const pet = await db.pet.create({ data: { name: "Rex", species: "DOG", ownerId: tutor.id } });

  const booking = await db.booking.create({
    data: {
      code: `ANM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      status: "PENDING",
      startsAt: inDays(1),
      endsAt: inDays(1.05),
      priceCents: 2500,
      tutorId: tutor.id,
      petId: pet.id,
      offeringId: offering.id,
      orgId: org.id,
      appointment: {
        create: {
          orgId: org.id,
          petId: pet.id,
          tutorId: tutor.id,
          serviceOfferingId: offering.id,
          serviceLabel: "Dog Walker",
          scheduledAt: inDays(1),
          durationMinutes: 60,
          status: "PENDING",
        },
      },
    },
    select: { id: true, appointment: { select: { id: true } } },
  });

  return { tutor, org, pet, bookingId: booking.id, appointmentId: booking.appointment!.id };
}

describe.concurrent("CreateAppointmentUseCase", () => {
  test("creates the walk-in client alongside the appointment", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);

    const appointment = await new CreateAppointmentUseCase({ db }).execute({
      organizationId: org.id,
      data: appointmentData(),
    });

    expect(appointment.clientContact?.name).toBe("Ana Souza");
    expect(appointment.tutor).toBeNull();
    // A provider writing their own diary has already agreed the time.
    expect(appointment.status).toBe("CONFIRMED");

    const contacts = await db.clientContact.count({ where: { orgId: org.id } });
    expect(contacts).toBe(1);
  });

  test("reuses the contact when the same number books again", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const useCase = new CreateAppointmentUseCase({ db });

    await useCase.execute({ organizationId: org.id, data: appointmentData() });
    await useCase.execute({
      organizationId: org.id,
      data: appointmentData({ scheduledAt: inDays(3) }),
    });

    // The prototype stored clientName + phone per appointment, so this was two
    // unrelated rows and client history was impossible.
    const contacts = await db.clientContact.count({ where: { orgId: org.id } });
    expect(contacts).toBe(1);

    const appointments = await db.appointment.count({ where: { orgId: org.id } });
    expect(appointments).toBe(2);
  });

  test("refuses an animal this organization has no relationship with", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { user: stranger } = await createUserSession(db);
    const pet = await db.pet.create({
      data: { name: "Alheio", species: "DOG", ownerId: stranger.id },
    });

    await expect(
      new CreateAppointmentUseCase({ db }).execute({
        organizationId: org.id,
        data: appointmentData({ petId: pet.id }),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("refuses both an existing client and a new one at once", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const contact = await db.clientContact.create({
      data: { orgId: org.id, name: "Carlos", phone: "(11) 97777-0000" },
    });

    await expect(
      new CreateAppointmentUseCase({ db }).execute({
        organizationId: org.id,
        data: appointmentData({ clientContactId: contact.id }),
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe.concurrent("SetAppointmentStatusUseCase", () => {
  test("moves the linked booking and notifies the tutor", async ({ db, expect }) => {
    const { org, tutor, bookingId, appointmentId } = await seedBookingWithAppointment(db);

    await new SetAppointmentStatusUseCase({ db }).execute({
      organizationId: org.id,
      id: appointmentId,
      status: "CONFIRMED",
    });

    // The seam between the two apps: a service confirmed in `plus` has to read
    // as confirmed in `app`.
    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");

    const notifications = await db.notification.findMany({ where: { userId: tutor.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("SERVICE");
  });

  test("cancelling stamps the booking's cancellation too", async ({ db, expect }) => {
    const { org, bookingId, appointmentId } = await seedBookingWithAppointment(db);

    await new SetAppointmentStatusUseCase({ db }).execute({
      organizationId: org.id,
      id: appointmentId,
      status: "CANCELLED",
    });

    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CANCELLED");
    expect(booking.cancelledAt).not.toBeNull();
  });

  test("refuses an illegal transition", async ({ db, expect }) => {
    const { org, appointmentId } = await seedBookingWithAppointment(db);
    const useCase = new SetAppointmentStatusUseCase({ db });

    await useCase.execute({ organizationId: org.id, id: appointmentId, status: "CANCELLED" });

    // The prototype's dropdown offered every status from every status, so a
    // cancelled appointment could be marked "realizado".
    await expect(
      useCase.execute({ organizationId: org.id, id: appointmentId, status: "COMPLETED" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  test("does not notify the tutor about a no-show", async ({ db, expect }) => {
    const { org, tutor, appointmentId } = await seedBookingWithAppointment(db);
    const useCase = new SetAppointmentStatusUseCase({ db });

    await useCase.execute({ organizationId: org.id, id: appointmentId, status: "CONFIRMED" });
    await db.notification.deleteMany({ where: { userId: tutor.id } });

    await useCase.execute({ organizationId: org.id, id: appointmentId, status: "NO_SHOW" });

    const notifications = await db.notification.count({ where: { userId: tutor.id } });
    expect(notifications).toBe(0);
  });

  test("refuses an appointment belonging to another organization", async ({ db, expect }) => {
    const { appointmentId } = await seedBookingWithAppointment(db);
    const { org: other } = await createProviderSession(db);

    await expect(
      new SetAppointmentStatusUseCase({ db }).execute({
        organizationId: other.id,
        id: appointmentId,
        status: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.concurrent("UpdateAppointmentUseCase", () => {
  test("rescheduling moves the booking window", async ({ db, expect }) => {
    const { org, bookingId, appointmentId } = await seedBookingWithAppointment(db);
    const newTime = inDays(5);

    await new UpdateAppointmentUseCase({ db }).execute({
      organizationId: org.id,
      id: appointmentId,
      scheduledAt: newTime,
    });

    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.startsAt.getTime()).toBe(newTime.getTime());
    expect(booking.endsAt.getTime()).toBeGreaterThan(newTime.getTime());
  });

  test("refuses to edit an encerrado appointment", async ({ db, expect }) => {
    const { org, appointmentId } = await seedBookingWithAppointment(db);

    await db.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } });

    await expect(
      new UpdateAppointmentUseCase({ db }).execute({
        organizationId: org.id,
        id: appointmentId,
        serviceLabel: "Outra coisa",
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe.concurrent("ListAppointmentsUseCase", () => {
  test("filters by period, status and text, scoped to the organization", async ({ db, expect }) => {
    const { org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);
    const create = new CreateAppointmentUseCase({ db });

    await create.execute({
      organizationId: org.id,
      data: appointmentData({ serviceLabel: "Banho e Tosa", scheduledAt: inDays(0.2) }),
    });
    await create.execute({
      organizationId: org.id,
      data: appointmentData({
        serviceLabel: "Castração",
        scheduledAt: inDays(20),
        newClient: { name: "Bruno", phone: "(11) 96666-2222" },
      }),
    });
    await create.execute({ organizationId: other.id, data: appointmentData() });

    const useCase = new ListAppointmentsUseCase({ db });

    const all = await useCase.execute({ organizationId: org.id, period: "all", limit: 100 });
    expect(all).toHaveLength(2);

    const thisWeek = await useCase.execute({
      organizationId: org.id,
      period: "week",
      limit: 100,
    });
    expect(thisWeek.map((row) => row.serviceLabel)).toEqual(["Banho e Tosa"]);

    const searched = await useCase.execute({
      organizationId: org.id,
      period: "all",
      q: "castra",
      limit: 100,
    });
    expect(searched.map((row) => row.serviceLabel)).toEqual(["Castração"]);

    const cancelled = await useCase.execute({
      organizationId: org.id,
      period: "all",
      status: "CANCELLED",
      limit: 100,
    });
    expect(cancelled).toHaveLength(0);
  });
});

describe.concurrent("ClientContact uniqueness", () => {
  test("rejects a second client with the same phone in one organization", async ({
    db,
    expect,
  }) => {
    const { CreateClientContactUseCase } =
      await import("../../../src/use-cases/client-contact/client-contact.use-cases.ts");

    const { org } = await createProviderSession(db);
    const useCase = new CreateClientContactUseCase({ db });

    await useCase.execute({
      organizationId: org.id,
      data: { name: "Ana", phone: "(11) 95555-1111" },
    });

    await expect(
      useCase.execute({
        organizationId: org.id,
        data: { name: "Ana de novo", phone: "(11) 95555-1111" },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("allows the same phone at a different organization", async ({ db, expect }) => {
    const { CreateClientContactUseCase } =
      await import("../../../src/use-cases/client-contact/client-contact.use-cases.ts");

    const { org: first } = await createProviderSession(db);
    const { org: second } = await createProviderSession(db);
    const useCase = new CreateClientContactUseCase({ db });

    const data = { name: "Ana", phone: "(11) 94444-3333" };

    await useCase.execute({ organizationId: first.id, data });
    const other = await useCase.execute({ organizationId: second.id, data });

    expect(other.name).toBe("Ana");
  });
});
