import {
  auth,
  canAdministerOrganization,
  canWriteOrganization,
  findMembership,
} from "@animalesko/auth";
import { db, type Database } from "@animalesko/db";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { createUseCases, type UseCases } from "./container.ts";
import { UseCaseError } from "./use-cases/errors.ts";

import type { SessionOrganization } from "@animalesko/auth/permissions";

export interface CreateContextOptions {
  headers: Headers;
  /** Overridable so integration tests can inject a client bound to the test DB. */
  db?: Database;
}

export interface Context {
  db: Database;
  useCases: UseCases;
  headers: Headers;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

export async function createTRPCContext(options: CreateContextOptions): Promise<Context> {
  const session = await auth.api.getSession({ headers: options.headers });
  const client = options.db ?? db;

  return {
    db: client,
    // Built from the *resolved* client, so a test-injected database reaches the
    // use cases too.
    useCases: createUseCases({ db: client }),
    headers: options.headers,
    session,
  };
}

const t = initTRPC.context<Context>().create({
  // Dates cross the wire intact — the prototypes stringified everything and
  // then re-parsed it at every call site. Prisma `Decimal` columns are *not*
  // covered by this: superjson has no entry for that class, so use cases
  // convert them to numbers before returning (see `toPetDTO`).
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Surfaces per-field validation errors so forms can map them back onto
        // inputs instead of showing one opaque message.
        zodError: error.cause instanceof ZodError ? z4FlattenedError(error.cause) : null,
      },
    };
  },
});

function z4FlattenedError(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path) {
      (fieldErrors[path] ??= []).push(issue.message);
    } else {
      formErrors.push(issue.message);
    }
  }

  return { formErrors, fieldErrors };
}

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;

/**
 * Translates domain errors thrown by use cases into transport errors.
 *
 * This is the seam that lets `use-cases/` stay free of any tRPC import. A use
 * case throws `NotFoundError`; tRPC catches it, wraps it as an
 * INTERNAL_SERVER_ERROR and keeps the original on `.cause`; this middleware
 * recognises it and re-throws with the right code.
 *
 * Note `next()` resolves to `{ ok: false, error }` rather than throwing, which
 * is why this inspects the result instead of using try/catch.
 */
const mapUseCaseErrors = t.middleware(async ({ next }) => {
  const result = await next();

  if (!result.ok) {
    const { cause } = result.error;
    if (cause instanceof UseCaseError) {
      throw new TRPCError({ code: cause.code, message: cause.message, cause });
    }
  }

  return result;
});

/**
 * Base for every procedure. The error mapper is applied first so that it wraps
 * the resolver — a middleware only sees failures from the steps after it.
 */
const baseProcedure = t.procedure.use(mapUseCaseErrors);

/** Anyone, signed in or not. */
export const publicProcedure = baseProcedure;

/** Requires a signed-in user; narrows ctx.session to non-null. */
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar autenticado.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

/**
 * Requires the caller to act for an organization they belong to.
 *
 * Every `plus` mutation goes through this: the org is taken from the session's
 * membership list rather than from client input, so a caller cannot write to
 * an organization by guessing its id. Use cases receive only the resolved
 * `organizationId` and never see the session.
 */
export const providerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const organizations = (ctx.session.organizations ?? []) as SessionOrganization[];
  const activeId = ctx.session.activeOrganizationId ?? organizations[0]?.id;

  const membership = activeId ? findMembership(organizations, activeId) : undefined;

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Nenhuma organização ativa para esta conta.",
    });
  }

  if (!canWriteOrganization(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu perfil não permite esta ação.",
    });
  }

  return next({ ctx: { ...ctx, organization: membership } });
});

/**
 * Requires the caller to be an OWNER or ADMIN of the active organization.
 *
 * The distinction `providerProcedure` does not make: a STAFF member runs the
 * agenda and records clinical notes all day, but must not be able to rename the
 * business, submit its verification documents or delete a listing. Layered on
 * top of `providerProcedure` so the organization is already resolved and only
 * the role check is added.
 */
export const adminProcedure = providerProcedure.use(async ({ ctx, next }) => {
  if (!canAdministerOrganization(ctx.organization.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores da organização podem fazer isto.",
    });
  }

  return next({ ctx });
});
