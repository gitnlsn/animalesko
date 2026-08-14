import { createTestClient } from "@animalesko/db/testing";
import { test as baseTest } from "vitest";

import type { Database, Prisma } from "@animalesko/db";

/**
 * One Prisma client per test file. Vitest isolates module state per file, so
 * each file gets its own client and its own bounded pool.
 */
export const testDb: Database = createTestClient({ maxConnections: 10 });

/** Thrown to abort the transaction; never escapes the fixture. */
class Rollback extends Error {
  constructor() {
    super("rollback");
    this.name = "Rollback";
  }
}

/**
 * A test that runs entirely inside a transaction which is then rolled back.
 *
 * This is what lets the suite run concurrently with no truncation anywhere:
 * nothing a test writes is ever committed, so tests cannot observe each other's
 * rows and the database never accumulates a single row. Global reads (the
 * catalog browse use cases) therefore still see only what the test itself
 * inserted.
 *
 * Two rules for anything using this fixture:
 *
 *   1. Use the injected `db` for *everything* — arrange, act and assert. A read
 *      through the module-level `testDb` runs outside the transaction and sees
 *      an empty database.
 *   2. Insert unique values for unique columns (see `uniqueMicrochip`,
 *      `uniqueEmail`). Two concurrent transactions writing the same unique key
 *      block one another until the first rolls back.
 *
 * Limitation: Prisma has no nested interactive transactions. A use case that
 * opens its own `$transaction` cannot be tested through this fixture — such a
 * test has to use `testDb` directly and clean up after itself.
 */
export const test = baseTest.extend<{ db: Prisma.TransactionClient }>({
  // Vitest reads the destructured names of the first parameter to work out
  // which other fixtures this one depends on, so the empty pattern is the
  // documented way to say "none" — it cannot be replaced with a plain name.
  // eslint-disable-next-line no-empty-pattern
  db: async ({}, use) => {
    let failure: unknown;
    let failed = false;

    await testDb
      .$transaction(
        async (tx) => {
          // The test body runs here, inside the transaction.
          try {
            await use(tx);
          } catch (error) {
            // Captured rather than rethrown, so the rollback below still runs
            // and the assertion error is not replaced by `Rollback`.
            failure = error;
            failed = true;
          }

          throw new Rollback();
        },
        {
          // Prisma's 5s default is far too tight for a test that seeds a few
          // rows on a cold pool.
          timeout: 60_000,
          maxWait: 15_000,
        },
      )
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    if (failed) throw failure;
  },
});

export { expect } from "vitest";

/**
 * A distinct 15-digit microchip per call.
 *
 * `Pet.microchip` is unique, so a hardcoded value shared by two concurrent
 * transactions would make one wait on the other's lock until it rolls back.
 */
export function uniqueMicrochip(): string {
  return Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
}

/** A distinct address per call; `User.email` is unique. */
export function uniqueEmail(label = "user"): string {
  return `${label}-${crypto.randomUUID()}@example.com`;
}
