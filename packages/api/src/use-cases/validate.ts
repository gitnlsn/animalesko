import { InvalidInputError } from "./errors.ts";

import type { ZodType } from "zod";

/**
 * Re-validates command data inside the use case.
 *
 * The tRPC layer already parses `.input()`, so on the HTTP path this is
 * redundant — but a use case is now callable from a script, a seed, a queue
 * worker or another use case, and none of those pass through a router. Parsing
 * here means the guarantee holds for every caller, not just the one that
 * happens to go over HTTP.
 *
 * It also strips unknown keys, which is what stops a caller from smuggling a
 * column the contract never offered (`ownerId`, `deceasedAt`) into a Prisma
 * write via object spread.
 */
export function parseCommandData<TOut>(schema: ZodType<TOut>, value: unknown): TOut {
  const result = schema.safeParse(value);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("; ");

    throw new InvalidInputError(`Dados inválidos — ${detail}`, { cause: result.error });
  }

  return result.data;
}
