import type { PrismaClient } from "./generated/client.ts";

/**
 * Empties every application table in one statement.
 *
 * TRUNCATE ... CASCADE is dramatically faster than deleting per-model in FK
 * order, and it cannot be defeated by adding a new model later — the table list
 * is read from the catalog, not hardcoded. `_prisma_migrations` is preserved so
 * the schema does not have to be re-applied afterwards.
 *
 * CASCADE also sidesteps the referential traps a delete-based teardown hits:
 * `Appointment.tutorId`, `HealthRecord.authorId`, `Vaccination.orgId` and
 * `ClientContact.userId` are all `onDelete: SetNull`, so deleting users and
 * organizations would leave orphan rows behind, and `Booking.offeringId`
 * declares no `onDelete` at all, which makes it RESTRICT.
 *
 * This module carries no guard of its own — it truncates whatever client it is
 * handed. Callers are responsible for confirming the target first:
 * `testDatabaseUrl()` in ./testing.ts for the integration suite,
 * `resolveTarget()` in prisma/seed/target.ts for the seed and cleanup scripts.
 */
export async function truncateAllTables(client: PrismaClient): Promise<void> {
  const tables = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");

  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
