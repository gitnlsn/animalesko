import { db } from "@animalesko/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins/custom-session";

import { organizationsForUser, type SessionOrganization } from "./permissions.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

/**
 * Better Auth compares the request's `Origin` header against `trustedOrigins`
 * by exact string equality on the normalized origin, so a configured value
 * carrying a trailing slash silently never matches.
 */
function origin(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : undefined;
}

// Set on every Vercel deployment: the deployment's own hostname, and the
// project's production hostname. Previews get a fresh hostname per commit, so
// they can only be trusted by deriving them here rather than by configuration.
const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const appUrl = origin(process.env.NEXT_PUBLIC_APP_URL) ?? productionUrl ?? "http://localhost:3000";
const plusUrl = origin(process.env.NEXT_PUBLIC_PLUS_URL) ?? "http://localhost:3001";

// On a preview the deployment hostname is the one the browser is actually on;
// pointing baseURL at the production host there would break callbacks.
const baseUrl =
  origin(process.env.BETTER_AUTH_URL) ??
  (process.env.VERCEL_ENV === "preview" ? deploymentUrl : undefined) ??
  appUrl;

/**
 * One Better Auth instance, mounted by both apps.
 *
 * Sessions are deliberately shared: a provider who is also a tutor signs in
 * once and moves between app.animalesko.com and plus.animalesko.com without
 * re-authenticating. In production that requires AUTH_COOKIE_DOMAIN to be set
 * to the registrable parent domain (".animalesko.com").
 */
export const auth = betterAuth({
  appName: "Animalesko",
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  baseURL: baseUrl,

  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // The prototype's LoginButton accepted 6 characters; keep the floor but
    // raise it, since these are real credentials now.
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh at most once a day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
    additionalFields: {
      // Which organization a `plus` user is currently acting for. Persisted on
      // the session so switching orgs survives a reload.
      activeOrganizationId: { type: "string", required: false, input: false },
    },
  },

  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
      bio: { type: "string", required: false, input: true },
      street: { type: "string", required: false, input: true },
      city: { type: "string", required: false, input: true },
      state: { type: "string", required: false, input: true },
      postalCode: { type: "string", required: false, input: true },
    },
  },

  // Both origins must be trusted or cross-app sign-in is rejected as CSRF. The
  // Vercel hostnames are included so preview deployments — and the production
  // alias, before a custom domain exists — can sign in without extra config.
  trustedOrigins: [appUrl, plusUrl, deploymentUrl, productionUrl].filter(
    (value): value is string => Boolean(value),
  ),

  advanced: {
    crossSubDomainCookies: process.env.AUTH_COOKIE_DOMAIN
      ? { enabled: true, domain: process.env.AUTH_COOKIE_DOMAIN }
      : { enabled: false },
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  databaseHooks: {
    user: {
      create: {
        // Every new account gets its gamification profile up front, so the
        // rest of the codebase never has to handle a missing one.
        after: async (user) => {
          await db.gamificationProfile.create({ data: { userId: user.id } });
        },
      },
    },
  },

  plugins: [
    /**
     * Attaches the caller's roles and organization memberships to the session.
     * `plus` authorises on this: no membership, no provider surface. Doing it
     * here means every consumer of `auth.api.getSession` gets it for free
     * instead of re-querying per request.
     */
    customSession(async ({ user, session }) => {
      const [record, organizations] = await Promise.all([
        db.user.findUnique({
          where: { id: user.id },
          select: { roles: true },
        }),
        organizationsForUser(db, user.id),
      ]);

      // customSession types its `session` argument from the base options,
      // which are resolved before `session.additionalFields` is applied — so
      // the extra column is present at runtime but invisible to the compiler.
      const { activeOrganizationId } = session as typeof session & {
        activeOrganizationId?: string | null;
      };

      return {
        user,
        session,
        roles: record?.roles ?? [],
        organizations,
        activeOrganizationId: activeOrganizationId ?? organizations[0]?.id ?? null,
      };
    }),

    // Must stay last: it flushes Set-Cookie headers from Server Actions and
    // Route Handlers, and it only sees cookies set by plugins before it.
    nextCookies(),
  ],
});

export {
  canAdministerOrganization,
  canWriteOrganization,
  findMembership,
  organizationsForUser,
} from "./permissions.ts";

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
export type SessionUser = Session["user"];
export type { SessionOrganization };
