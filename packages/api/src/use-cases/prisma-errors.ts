import { Prisma } from "@animalesko/db";

/**
 * Reading unique-constraint violations out of Prisma, which reports them in two
 * different shapes.
 *
 * Prisma 7 requires a driver adapter, and adapters nest the constraint details
 * under `meta.driverAdapterError.cause.constraint.fields`. The classic
 * `meta.target` (a string or an array, depending on the connector) is still what
 * the docs describe and what non-adapter paths produce. Both are handled here so
 * no caller has to care which one it got — this was a real bug during the
 * original build, where checking only `meta.target` let every duplicate
 * microchip surface as an INTERNAL_SERVER_ERROR.
 */
export function uniqueConstraintFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = error.meta as
    | {
        target?: string | string[];
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;

  const adapterFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (adapterFields?.length) return adapterFields;

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
