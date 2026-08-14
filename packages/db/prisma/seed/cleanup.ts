import { truncateAllTables } from "../../src/reset.ts";
import { BADGE_COUNT, seedReference } from "./reference.ts";
import {
  createTargetClient,
  exactCounts,
  listTables,
  printTargetBanner,
  resolveTarget,
  tableCounts,
} from "./target.ts";

/**
 * Hands the database over to real users.
 *
 * Truncate rather than delete-what-the-seed-made. Two reasons, and the second
 * is the one that decides it:
 *
 *   * the table list comes from `pg_tables`, so a model added later cannot be
 *     missed by a cleanup nobody remembered to update;
 *   * several relations are `onDelete: SetNull` — `Appointment.tutorId`,
 *     `HealthRecord.authorId`, `Vaccination.orgId`, `ClientContact.userId` — so
 *     deleting the seeded users and organizations would leave orphaned rows
 *     behind rather than removing them, and `Booking.offeringId` declares no
 *     `onDelete` at all, which makes it RESTRICT.
 *
 * What survives is the reference layer: the four badges, which are application
 * content rather than demonstration data, and one administrator if
 * ADMIN_EMAIL/ADMIN_PASSWORD were supplied.
 */

/** Tables allowed to be non-empty afterwards, with their ceiling. */
const EXPECTED_SURVIVORS: Record<string, number> = {
  badge: BADGE_COUNT,
  user: 1,
  account: 1,
  gamification_profile: 1,
};

export async function cleanup(): Promise<number> {
  const target = resolveTarget({ operation: "wipe" });
  const db = createTargetClient(target);

  try {
    printTargetBanner(target, "Cleaning Animalesko");

    const before = (await tableCounts(db)).filter((row) => row.rows > 0);

    if (before.length === 0) {
      console.info("  Database is already empty.");
    } else {
      const total = before.reduce((sum, row) => sum + row.rows, 0);
      console.info(`  About to delete ${total} rows:`);
      const width = Math.max(...before.map((row) => row.table.length));
      for (const row of before) {
        console.info(`    ${row.table.padEnd(width)}  ${String(row.rows).padStart(6)}`);
      }
      console.info("");
    }

    await truncateAllTables(db);

    const reference = await seedReference(db);

    console.info(`  Badges restored: ${reference.badges}`);
    if (reference.admin) {
      console.info(`  Administrator:   ${reference.admin.email}`);
    }

    const tables = await listTables(db);
    const counts = await exactCounts(db, tables);

    const leftovers = [...counts.entries()].filter(
      ([table, rows]) => rows > (EXPECTED_SURVIVORS[table] ?? 0),
    );

    console.info("");

    if (leftovers.length > 0) {
      console.error("  Rows survived the cleanup that should not have:");
      for (const [table, rows] of leftovers) {
        console.error(`    ${table}: ${rows} (expected at most ${EXPECTED_SURVIVORS[table] ?? 0})`);
      }
      return 1;
    }

    const kept = [...counts.entries()].filter(([, rows]) => rows > 0);
    console.info("  Clean. Remaining rows:");
    for (const [table, rows] of kept) console.info(`    ${table}: ${rows}`);
    if (kept.length === 0) console.info("    (none)");

    console.info("");
    console.info("  The database is ready for real users. Demo sign-ins no longer exist.");
    console.info("");

    return 0;
  } finally {
    await db.$disconnect();
  }
}
