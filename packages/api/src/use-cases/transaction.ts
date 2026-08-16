import { AsyncLocalStorage } from "node:async_hooks";

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
  // Already inside one: join it, and let the outermost call own the effects.
  // Flushing here would fire them before the real commit.
  if (!isTransactable(db)) {
    return fn(db as Prisma.TransactionClient);
  }

  const effects: AfterCommitEffect[] = [];
  const result = await effectStorage.run(effects, () => db.$transaction(fn));

  await flush(effects);
  return result;
}

type AfterCommitEffect = () => Promise<void> | void;

const effectStorage = new AsyncLocalStorage<AfterCommitEffect[]>();

/**
 * Defers work until the surrounding transaction has actually committed.
 *
 * Push delivery is the reason this exists. `notify` runs inside the transaction
 * that creates the thing being announced — a booking, a message — and sending
 * from there would push a notification for a booking that then rolls back, and
 * would hold a database connection open across a network call to Firebase for
 * every recipient.
 *
 * Registered effects run after `$transaction` resolves, and are skipped
 * entirely if it throws: `run` unwinds before `flush` is reached.
 *
 * Outside any transaction — a caller that never went through
 * `withTransaction` — the effect runs immediately, which is the same ordering
 * guarantee that context could offer.
 */
export function afterCommit(effect: AfterCommitEffect): void {
  const effects = effectStorage.getStore();

  if (!effects) {
    void Promise.resolve()
      .then(effect)
      .catch(() => undefined);
    return;
  }

  effects.push(effect);
}

/**
 * Effects are independent of each other and of the caller's response: a
 * Firebase outage must not turn a booking that *did* commit into a failed
 * request. So each is awaited for ordering but its rejection is swallowed.
 */
async function flush(effects: AfterCommitEffect[]): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch {
      // Deliberately ignored — see above.
    }
  }
}
