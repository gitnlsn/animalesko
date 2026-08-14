/**
 * Transport-agnostic errors raised by use cases.
 *
 * Nothing in `use-cases/` may import from `@trpc/*` — that is what keeps a use
 * case callable from a test, a script or a queue worker, not just an HTTP
 * request. The `code` values below are deliberately spelled the same as tRPC's
 * so the adapter in `trpc.ts` can map them mechanically without either side
 * knowing about the other.
 */

export type UseCaseErrorCode =
  "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

export abstract class UseCaseError extends Error {
  abstract readonly code: UseCaseErrorCode;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Without this, `instanceof` fails for subclasses when the output targets
    // ES5-era prototypes, and the error-mapping middleware silently degrades
    // every domain error to INTERNAL_SERVER_ERROR.
    this.name = new.target.name;
  }
}

/** The caller is not signed in. */
export class UnauthorizedError extends UseCaseError {
  readonly code = "UNAUTHORIZED" as const;
}

/**
 * The caller is known but may not do this — a plan limit, a missing
 * organization, an insufficient role.
 */
export class ForbiddenError extends UseCaseError {
  readonly code = "FORBIDDEN" as const;
}

/**
 * The resource does not exist *for this caller*. Used for genuinely missing
 * rows and for rows belonging to someone else alike: the two must be
 * indistinguishable, or the error itself becomes a way to probe which ids exist.
 */
export class NotFoundError extends UseCaseError {
  readonly code = "NOT_FOUND" as const;
}

/** The write collides with something already stored (a unique constraint). */
export class ConflictError extends UseCaseError {
  readonly code = "CONFLICT" as const;
}

/** Semantically invalid input that Zod cannot express on its own. */
export class InvalidInputError extends UseCaseError {
  readonly code = "BAD_REQUEST" as const;
}
