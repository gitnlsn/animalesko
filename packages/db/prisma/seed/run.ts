import { truncateAllTables } from "../../src/reset.ts";
import { reportChecks, runChecks } from "./checks.ts";
import { seedAdoption } from "./demo/adoption.ts";
import { seedAnimals } from "./demo/animals.ts";
import { seedCommerce } from "./demo/commerce.ts";
import { seedCommunity } from "./demo/community.ts";
import { deriveAggregates } from "./demo/derive.ts";
import { seedEngagement } from "./demo/engagement.ts";
import { DEMO_PASSWORD, seedIdentity } from "./demo/identity.ts";
import { seedSupply } from "./demo/supply.ts";
import { seedReference } from "./reference.ts";
import { Rng } from "./rng.ts";
import { createTargetClient, printTargetBanner, resolveTarget, tableCounts } from "./target.ts";

import type { SeedContext } from "./context.ts";
import type { PrismaClient } from "../../src/index.ts";

/**
 * The seed, end to end.
 *
 * Two layers, in order: `reference` — the badges every deployment needs — and
 * `demo`, the population a reviewer walks through. The demo layer truncates
 * first rather than upserting in place, for one reason that matters more than
 * it sounds: every date it writes is relative to the moment it runs. An
 * idempotent re-seed three weeks later would leave "hoje na agenda" pointing at
 * a day three weeks past, which is exactly the failure the previous seed had.
 */

export interface RunOptions {
  /** Skip the demo layer — what production actually needs applied. */
  referenceOnly: boolean;
}

export async function run(options: RunOptions): Promise<number> {
  const target = resolveTarget({
    operation: options.referenceOnly ? "seed reference data into" : "seed",
  });

  const db = createTargetClient(target);

  try {
    printTargetBanner(
      target,
      options.referenceOnly ? "Seeding reference data" : "Seeding Animalesko",
    );

    if (!options.referenceOnly) {
      const before = (await tableCounts(db)).filter((row) => row.rows > 0);

      if (before.length > 0) {
        const total = before.reduce((sum, row) => sum + row.rows, 0);
        console.info(`  Replacing ${total} existing rows across ${before.length} tables:`);
        for (const row of before.slice(0, 6)) {
          console.info(`    ${row.table.padEnd(26)} ${String(row.rows).padStart(6)}`);
        }
        if (before.length > 6) console.info(`    … and ${before.length - 6} more`);
        console.info("");
      }

      await truncateAllTables(db);
    }

    const reference = await seedReference(db);

    if (options.referenceOnly) {
      console.info(`  Badges: ${reference.badges}`);
      if (reference.admin) {
        console.info(
          `  Admin:  ${reference.admin.email} (${reference.admin.created ? "created" : "updated"})`,
        );
      }
      return 0;
    }

    // A single instant for the whole run, so "today" means the same thing in
    // every generator and the relative dates line up with each other.
    const now = new Date();
    const seed = process.env.SEED_RANDOM_SEED ?? "animalesko";
    const ctx: SeedContext = { db, rng: new Rng(seed), now };

    console.info(`  random seed: ${seed}`);
    console.info("");

    const people = await step("people", () => seedIdentity(ctx));
    const supply = await step("organizations, offerings, clients", () =>
      seedSupply(ctx, { users: people.users, providers: people.providers }),
    );
    const animals = await step("animals, clinical records, reminders", () =>
      seedAnimals(ctx, {
        tutors: people.tutors,
        heroTutor: people.heroTutor,
        fosterTutor: people.fosterTutor,
        orgs: supply.orgs,
        shelters: supply.shelters,
        clinics: supply.clinics,
      }),
    );
    const adoption = await step("adoption listings and applications", () =>
      seedAdoption(ctx, {
        custodyPets: animals.custodyPets,
        ownedPets: animals.ownedPets,
        orgs: supply.orgs,
        tutors: people.tutors,
      }),
    );

    // Adopted animals changed hands during the step above, so the two
    // populations are recomputed rather than reused.
    const ownedPets = animals.pets.filter((pet) => pet.ownerId !== null);
    const custodyPets = animals.pets.filter((pet) => pet.custodianOrgId !== null);

    const commerce = await step("bookings, payments, reviews, appointments", () =>
      seedCommerce(ctx, {
        tutors: people.tutors,
        heroTutor: people.heroTutor,
        orgs: supply.orgs,
        offerings: supply.offerings,
        ownedPets,
        custodyPets,
        clientContacts: supply.clientContacts,
      }),
    );

    await step("alerts, conversations, notifications", () =>
      seedCommunity(ctx, {
        users: people.users,
        tutors: people.tutors,
        heroTutor: people.heroTutor,
        orgs: supply.orgs,
        listings: adoption.listings,
        bookings: commerce.bookings,
        ownedPets,
      }),
    );

    await step("favourites, points, badges", () =>
      seedEngagement(ctx, {
        users: people.users,
        tutors: people.tutors,
        heroTutor: people.heroTutor,
        listings: adoption.listings,
        offerings: supply.offerings,
      }),
    );

    await step("denormalised aggregates", () => deriveAggregates(ctx));

    await printSummary(db);

    const checks = await runChecks(db, now);
    const passed = reportChecks(checks);

    console.info(`  Sign in to app  as ${people.heroTutor.email} / ${DEMO_PASSWORD}`);
    console.info(`  Sign in to plus as maria.silva@email.com / ${DEMO_PASSWORD}`);
    if (reference.admin) console.info(`  Administrator   ${reference.admin.email}`);
    console.info("");

    return passed ? 0 : 1;
  } finally {
    await db.$disconnect();
  }
}

async function step<T>(label: string, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await work();
  console.info(`  · ${label} (${Date.now() - started}ms)`);
  return result;
}

async function printSummary(db: PrismaClient): Promise<void> {
  const counts = (await tableCounts(db)).filter((entry) => entry.rows > 0);
  const width = Math.max(...counts.map((entry) => entry.table.length));
  const total = counts.reduce((sum, entry) => sum + entry.rows, 0);

  console.info("");
  console.info(`  Rows written: ${total}`);
  for (const entry of counts) {
    console.info(`    ${entry.table.padEnd(width)}  ${String(entry.rows).padStart(6)}`);
  }
}
