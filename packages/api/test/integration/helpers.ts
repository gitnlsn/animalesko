import { createUseCases } from "../../src/container.ts";
import { appRouter } from "../../src/routers/app.ts";
import { plusRouter } from "../../src/routers/plus.ts";
import { createCallerFactory, type Context } from "../../src/trpc.ts";
import { uniqueEmail } from "./db-fixture.ts";

import type { Database, OrganizationMemberRole, OrganizationType, Prisma } from "@animalesko/db";

/**
 * Every helper takes the transaction client the test was given, rather than
 * reaching for a module-level client. Anything that queried outside the
 * transaction would see an empty database.
 */
export type TestDb = Prisma.TransactionClient;

type Session = Context["session"];

/**
 * A `TransactionClient` is a `PrismaClient` minus `$transaction`, `$connect`
 * and friends — everything the use cases actually call is present.
 *
 * The cast is deliberately here and not a widening of `UseCaseDeps.db` to
 * `Prisma.TransactionClient`: that would type-check without a cast but would
 * permanently forbid a use case from opening its own transaction, and a booking
 * writing Booking + Payment + Appointment atomically will need exactly that.
 */
function asDatabase(db: TestDb): Database {
  return db as unknown as Database;
}

/**
 * Builds a context with a session fabricated directly, bypassing the HTTP
 * cookie round-trip.
 *
 * These tests exercise the routers — authorisation logic, ownership scoping,
 * plan limits, real SQL — not Better Auth's cookie handling, which is the
 * library's own concern. Passing `session: null` covers the anonymous case.
 */
export function contextFor(db: TestDb, session: Session): Context {
  return {
    db: asDatabase(db),
    useCases: createUseCases({ db: asDatabase(db) }),
    headers: new Headers(),
    session,
  };
}

export interface FakeUserOptions {
  email?: string;
  name?: string;
  roles?: ("TUTOR" | "PROVIDER" | "ADMIN")[];
}

/** Inserts a user and returns a session shaped like the one customSession emits. */
export async function createUserSession(db: TestDb, options: FakeUserOptions = {}) {
  const suffix = crypto.randomUUID();

  const user = await db.user.create({
    data: {
      email: options.email ?? uniqueEmail(),
      name: options.name ?? "Test User",
      emailVerified: true,
      roles: options.roles ?? ["TUTOR"],
      gamification: { create: {} },
    },
  });

  const session = {
    user,
    session: {
      id: `session-${suffix}`,
      token: `token-${suffix}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    roles: user.roles,
    organizations: [],
    activeOrganizationId: null,
  } as unknown as Session;

  return { user, session };
}

export interface FakeProviderOptions extends FakeUserOptions {
  /**
   * Membership role. OWNER by default; pass STAFF to exercise the gap between
   * `providerProcedure` (any member) and `adminProcedure` (OWNER/ADMIN only).
   */
  role?: OrganizationMemberRole;
  type?: OrganizationType;
}

/** Same, plus an organization the user belongs to — what providerProcedure requires. */
export async function createProviderSession(db: TestDb, options: FakeProviderOptions = {}) {
  const { user } = await createUserSession(db, { ...options, roles: ["PROVIDER"] });
  const suffix = crypto.randomUUID();
  const role = options.role ?? "OWNER";

  const org = await db.organization.create({
    data: {
      slug: `org-${suffix}`,
      name: `Org ${suffix}`,
      type: options.type ?? "INDEPENDENT",
      members: { create: { userId: user.id, role } },
    },
  });

  const organizations = [{ id: org.id, slug: org.slug, name: org.name, role }];

  const session = {
    user,
    session: {
      id: `session-${suffix}`,
      token: `token-${suffix}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      activeOrganizationId: org.id,
    },
    roles: user.roles,
    organizations,
    activeOrganizationId: org.id,
  } as unknown as Session;

  return { user, org, session };
}

const createAppCaller = createCallerFactory(appRouter);
const createPlusCaller = createCallerFactory(plusRouter);

export function appCaller(db: TestDb, session: Session) {
  return createAppCaller(contextFor(db, session));
}

export function plusCaller(db: TestDb, session: Session) {
  return createPlusCaller(contextFor(db, session));
}
