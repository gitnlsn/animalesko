import { Prisma } from "@animalesko/db";

/**
 * The index name Postgres reports in a 23505, which it always quotes:
 *
 *   duplicate key value violates unique constraint "pet_microchip_key"
 *
 * Only the quoting is stable — the sentence around it is translated by the
 * server's `lc_messages`, so a workstation with a pt_BR cluster produces
 * "duplicar valor da chave viola a restrição de unicidade" and CI does not.
 * Matching the quotes rather than the words is what makes this work on both.
 */
function quotedConstraintName(message: string): string | undefined {
  const quoted = message.match(/"([^"]+)"/g);
  if (!quoted?.length) return undefined;

  // The last one: a message that mentions a table before the index ends with
  // the index, and 23505 puts nothing after it.
  return quoted[quoted.length - 1]?.slice(1, -1);
}

/**
 * Reading unique-constraint violations out of Prisma, which reports them in
 * three different shapes.
 *
 * Prisma 7 requires a driver adapter, and `@prisma/adapter-pg` does not fill in
 * the `meta.target` the docs describe — it nests the driver's own error under
 * `meta.driverAdapterError.cause`. There the constraint arrives either as
 * `constraint.fields`, or — as this adapter actually does at 7.9 — as nothing
 * but the raw Postgres text in `originalMessage`, whose index name has to be
 * read back out. Prisma's own message says "Unique constraint failed on the
 * (not available)", so there is nothing else left to match on.
 *
 * Returning the index name rather than the column is deliberate and matches the
 * pre-existing `meta.target: string` behaviour: Prisma's default names embed
 * the columns (`review_bookingId_key`, `client_contact_orgId_phone_key`), which
 * is what makes `isUniqueViolationOn` work by substring.
 */
export function uniqueConstraintFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = error.meta as
    | {
        target?: string | string[];
        driverAdapterError?: {
          cause?: {
            constraint?: { fields?: string[] };
            originalMessage?: string;
          };
        };
      }
    | undefined;

  const cause = meta?.driverAdapterError?.cause;

  const adapterFields = cause?.constraint?.fields;
  if (adapterFields?.length) return adapterFields;

  if (cause?.originalMessage) {
    const name = quotedConstraintName(cause.originalMessage);
    if (name) return [name];
  }

  if (Array.isArray(meta?.target)) return meta.target;
  if (typeof meta?.target === "string") return [meta.target];

  return [];
}

/**
 * True when `error` is a unique-constraint violation touching `field`.
 *
 * Deliberately narrow: a violation on some *other* column must fall through to
 * the generic error handler rather than being reported as the one conflict the
 * caller happened to anticipate.
 */
export function isUniqueViolationOn(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  return uniqueConstraintFields(error).some((candidate) => candidate.includes(field));
}
