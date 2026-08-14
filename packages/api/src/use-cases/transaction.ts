import type { Prisma } from "@animalesko/db";

/**
 * The shape a client has when it *can* open a transaction. A
 * `Prisma.TransactionClient` — what you hold inside `$transaction` — does not
 * have this method, which is the distinction this module exists to handle.
 */
interface Transactable {
  $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
}

function isTransactable(db: unknown): db is Transactable {
  return typeof (db as Transactable).$transaction === "function";
}

/**
 * Runs `fn` atomically, joining an existing transaction rather than nesting.
 *
 * Prisma has no nested interactive transactions: calling `$transaction` on a
 * client that is already one throws, because the method is not there. So a use
 * case that writes several rows atomically cannot simply call `$transaction` —
 * it would work in production and fail the moment it is called from inside
 * another transaction.
 *
 * Two callers do exactly that:
 *
 *   * the integration suite, whose fixture wraps each test in a transaction it
 *     rolls back (see test/integration/db-fixture.ts), and
 *   * any future use case that composes another one.
 *
 * Joining is also the correct semantics rather than a testing concession: work
 * enrolled in an outer transaction is still all-or-nothing, and committing a
 * nested unit independently of its parent is not something any caller here
 * wants.
 */
export async function withTransaction<T>(
  db: unknown,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (isTransactable(db)) {
    return db.$transaction(fn);
  }

  return fn(db as Prisma.TransactionClient);
}
