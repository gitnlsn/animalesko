import { describe } from "vitest";

import { TRPCError } from "@trpc/server";

import { test } from "./db-fixture.ts";
import { createProviderSession, createUserSession, plusCaller } from "./helpers.ts";

/**
 * Router-level tests, so the role middleware is actually exercised — the use
 * cases below `adminProcedure` know nothing about roles, which is the point:
 * the gate belongs in one place.
 */
describe.concurrent("plus authorisation", () => {
  test("a tutor with no organization cannot reach the provider surface", async ({ db, expect }) => {
    const { session } = await createUserSession(db);
    const caller = plusCaller(db, session);

    await expect(caller.organization.current()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("an anonymous caller is unauthorised, not forbidden", async ({ db, expect }) => {
    const caller = plusCaller(db, null);

    await expect(caller.organization.current()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("STAFF may run the agenda", async ({ db, expect }) => {
    const { session } = await createProviderSession(db, { role: "STAFF" });
    const caller = plusCaller(db, session);

    const appointments = await caller.appointment.list({ period: "all" });
    expect(appointments).toEqual([]);

    const organization = await caller.organization.current();
    expect(organization.name).toBeTruthy();
  });

  test("STAFF may not rename the business", async ({ db, expect }) => {
    const { session, org } = await createProviderSession(db, { role: "STAFF" });
    const caller = plusCaller(db, session);

    await expect(
      caller.organization.update({ name: "Renomeada", type: "CLINIC" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const unchanged = await db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(unchanged.name).not.toBe("Renomeada");
  });

  test("STAFF may not submit verification documents", async ({ db, expect }) => {
    const { session } = await createProviderSession(db, { role: "STAFF" });
    const caller = plusCaller(db, session);

    await expect(
      caller.organization.submitVerification({
        documentUrl: "https://example.com/rg.pdf",
        addressProofUrl: "https://example.com/endereco.pdf",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  test("an ADMIN may do both", async ({ db, expect }) => {
    const { session } = await createProviderSession(db, { role: "ADMIN" });
    const caller = plusCaller(db, session);

    const updated = await caller.organization.update({ name: "Clínica Nova", type: "CLINIC" });
    expect(updated.name).toBe("Clínica Nova");
  });
});

describe.concurrent("organization profile", () => {
  test("clears optional fields to NULL rather than empty strings", async ({ db, expect }) => {
    const { session, org } = await createProviderSession(db);
    const caller = plusCaller(db, session);

    await caller.organization.update({
      name: "Pet Care",
      type: "PETSHOP",
      phone: "(11) 91234-5678",
      city: "São Paulo",
      state: "SP",
    });

    await caller.organization.update({ name: "Pet Care", type: "PETSHOP", phone: "", state: "" });

    // "" and NULL both meaning "no phone" is two representations of one fact.
    const stored = await db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(stored.phone).toBeNull();
    expect(stored.state).toBeNull();
  });
});

describe.concurrent("verification", () => {
  test("submitting moves the denormalised badge the consumer app reads", async ({ db, expect }) => {
    const { session, org } = await createProviderSession(db);
    const caller = plusCaller(db, session);

    expect(await caller.organization.verification()).toBeNull();

    const verification = await caller.organization.submitVerification({
      documentUrl: "https://example.com/rg.pdf",
      addressProofUrl: "https://example.com/endereco.pdf",
      experienceYears: 5,
    });

    expect(verification.status).toBe("PENDING");

    // A submitted application and a "não enviada" badge cannot coexist.
    const organization = await db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(organization.verificationStatus).toBe("PENDING");
  });

  test("re-submitting after a rejection resets the review", async ({ db, expect }) => {
    const { session, org } = await createProviderSession(db);
    const caller = plusCaller(db, session);

    await caller.organization.submitVerification({
      documentUrl: "https://example.com/rg.pdf",
      addressProofUrl: "https://example.com/endereco.pdf",
    });

    await db.providerVerification.update({
      where: { orgId: org.id },
      data: { status: "REJECTED", rejectionReason: "Documento ilegível", reviewedAt: new Date() },
    });

    const resubmitted = await caller.organization.submitVerification({
      documentUrl: "https://example.com/rg-melhor.pdf",
      addressProofUrl: "https://example.com/endereco.pdf",
    });

    expect(resubmitted.status).toBe("PENDING");
    expect(resubmitted.rejectionReason).toBeNull();
    expect(resubmitted.reviewedAt).toBeNull();
  });
});

describe.concurrent("dashboard stats", () => {
  test("count only this organization's rows", async ({ db, expect }) => {
    const { session, org } = await createProviderSession(db);
    const { org: other } = await createProviderSession(db);
    const caller = plusCaller(db, session);

    await db.pet.createMany({
      data: [
        { name: "Luna", species: "DOG", custodianOrgId: org.id },
        { name: "Bidu", species: "DOG", custodianOrgId: org.id },
        { name: "Alheio", species: "CAT", custodianOrgId: other.id },
      ],
    });

    await db.appointment.create({
      data: {
        orgId: org.id,
        serviceLabel: "Consulta",
        scheduledAt: new Date(Date.now() + 3_600_000),
        status: "PENDING",
      },
    });

    const stats = await caller.organization.stats();

    expect(stats.animalsInCustody).toBe(2);
    expect(stats.appointmentsToday + stats.appointmentsWeek).toBeGreaterThan(0);
    expect(stats.pendingAppointments).toBe(1);
  });
});
