import { insertMany } from "../context.ts";
import {
  BREEDS_BY_SPECIES,
  HEALTH_NOTES,
  HEALTH_SYMPTOMS,
  PET_NAMES,
  PET_NOTES,
  PHOTOS_BY_SPECIES,
  REMINDER_TEMPLATES,
  TEMPERAMENTS,
  VACCINE_NAMES,
  VETERINARIANS,
  photo,
} from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS, dateOnly, dateOnlyFrom } from "../rng.ts";

import type { DemoOrg, DemoPet, DemoUser, SeedContext, Species } from "../context.ts";
import type { Rng } from "../rng.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * The animals, and everything recorded about them.
 *
 * Two populations, because the schema has two: a tutor's own animal has an
 * `ownerId`, and an animal a shelter is holding has a `custodianOrgId`. Which
 * one a pet is decides almost everything downstream — only owned animals can be
 * booked, only held animals can be listed for adoption, and only held animals
 * appear in the `plus` dashboard's vaccination panel.
 */

/** Rex and Mimi, kept verbatim from the prototype the app was ported from. */
const HERO_PETS = [
  {
    name: "Rex",
    species: "DOG" as const,
    breed: "Golden Retriever",
    sex: "MALE" as const,
    size: "LARGE" as const,
    ageMonths: 65,
    weightKg: "25.00",
    healthStatus: "GOOD" as const,
    notes: "Pet muito ativo, gosta de brincar no parque. Alérgico a frango.",
  },
  {
    name: "Mimi",
    species: "CAT" as const,
    breed: "Persa",
    sex: "FEMALE" as const,
    size: "SMALL" as const,
    ageMonths: 37,
    weightKg: "4.00",
    healthStatus: "EXCELLENT" as const,
    notes: "Gata tranquila, prefere ambientes silenciosos.",
  },
];

/**
 * Luna, Thor, Nina and Bidu — the shelter animals the prototypes shipped with,
 * kept at the head of Abrigo Amigo's custody list so anyone who knew the old
 * seed still recognises the adoption feed.
 */
const HERO_SHELTER_PETS = [
  {
    name: "Luna",
    species: "DOG" as const,
    breed: "Golden Retriever",
    sex: "FEMALE" as const,
    size: "LARGE" as const,
    ageMonths: 24,
    weightKg: "27.50",
    healthStatus: "EXCELLENT" as const,
    notes: null,
  },
  {
    name: "Thor",
    species: "DOG" as const,
    breed: "Vira-lata",
    sex: "MALE" as const,
    size: "MEDIUM" as const,
    ageMonths: 8,
    weightKg: "14.00",
    healthStatus: "GOOD" as const,
    notes: null,
  },
  {
    name: "Nina",
    species: "CAT" as const,
    breed: "SRD",
    sex: "FEMALE" as const,
    size: "SMALL" as const,
    ageMonths: 42,
    weightKg: "3.80",
    healthStatus: "GOOD" as const,
    notes: "Levou meses para voltar a confiar em gente. Prefere casas calmas.",
  },
  {
    name: "Bidu",
    species: "DOG" as const,
    breed: "Beagle",
    sex: "MALE" as const,
    size: "MEDIUM" as const,
    ageMonths: 92,
    weightKg: "14.20",
    healthStatus: "ATTENTION" as const,
    notes: "Cão idoso. Precisa de acompanhamento articular.",
  },
];

/** Enough to page past the 50-row window on /meus-pets. */
const FOSTER_PET_COUNT = 55;
const CUSTODY_PER_SHELTER = 26;
const CUSTODY_PER_CLINIC = 5;

const SPECIES_WEIGHTS = [
  ["DOG", 55],
  ["CAT", 33],
  ["BIRD", 4],
  ["RODENT", 4],
  ["OTHER", 2],
  ["FISH", 1],
  ["REPTILE", 1],
] as const satisfies readonly (readonly [Species, number])[];

/**
 * Animals a shelter actually rehomes.
 *
 * Fish and reptiles are excluded, which is both true to life and load-bearing:
 * `PHOTOS_BY_SPECIES.REPTILE` is deliberately empty, so a reptile listing would
 * be a published card with no photo — and the alternative, illustrating a jabuti
 * with the rabbit from the OTHER pool, is worse than having none.
 */
const CUSTODY_SPECIES_WEIGHTS = [
  ["DOG", 58],
  ["CAT", 34],
  ["BIRD", 4],
  ["RODENT", 3],
  ["OTHER", 2],
] as const satisfies readonly (readonly [Species, number])[];

const WEIGHT_RANGE: Record<Species, [number, number]> = {
  DOG: [3, 42],
  CAT: [2.5, 7],
  BIRD: [0.08, 1.2],
  RODENT: [0.1, 2.5],
  REPTILE: [0.5, 5],
  FISH: [0.05, 0.4],
  OTHER: [1, 4],
};

export interface AnimalsResult {
  pets: DemoPet[];
  ownedPets: DemoPet[];
  custodyPets: DemoPet[];
}

export async function seedAnimals(
  ctx: SeedContext,
  world: {
    tutors: DemoUser[];
    heroTutor: DemoUser;
    fosterTutor: DemoUser;
    orgs: DemoOrg[];
    shelters: DemoOrg[];
    clinics: DemoOrg[];
  },
): Promise<AnimalsResult> {
  const { db, rng, now } = ctx;

  const pets: DemoPet[] = [];
  const petRows: Prisma.PetCreateManyInput[] = [];
  let petIndex = 0;

  function addPet(input: {
    owner: DemoUser | null;
    org: DemoOrg | null;
    species?: Species;
    ageMonths?: number;
    forAdoption: boolean;
    fixed?: (typeof HERO_PETS)[number] | (typeof HERO_SHELTER_PETS)[number];
  }): DemoPet {
    petIndex += 1;

    const species =
      input.fixed?.species ??
      input.species ??
      rng.weighted(input.org ? CUSTODY_SPECIES_WEIGHTS : SPECIES_WEIGHTS);
    const breed = input.fixed?.breed ?? rng.pick(BREEDS_BY_SPECIES[species]!);
    const ageMonths = input.fixed?.ageMonths ?? input.ageMonths ?? rng.int(4, 150);
    const size = input.fixed?.size ?? sizeFor(rng, species);
    const photos = PHOTOS_BY_SPECIES[species]!;

    // Deceased animals exist so the `includeDeceased` toggle on /meus-pets has
    // something to reveal, and because the plan quota deliberately does not
    // count them — a rule with no data behind it is a rule nobody can check.
    const deceased = input.owner !== null && !input.fixed && petIndex % 97 === 0;

    const pet: DemoPet = {
      id: id("pet", petIndex),
      name: input.fixed?.name ?? uniquePetName(petIndex),
      species,
      breed,
      ownerId: input.owner?.id ?? null,
      custodianOrgId: input.org?.id ?? null,
      city: input.owner?.city ?? input.org!.city,
      ageMonths,
      forAdoption: input.forAdoption,
    };

    pets.push(pet);

    petRows.push({
      id: pet.id,
      name: pet.name,
      species,
      breed,
      sex:
        input.fixed?.sex ??
        rng.weighted([
          ["MALE", 10],
          ["FEMALE", 10],
          ["UNKNOWN", 1],
        ] as const),
      size,
      birthDate: dateOnlyFrom(now, -Math.round(ageMonths * 30.44)),
      weightKg: input.fixed?.weightKg ?? weightFor(rng, species, size),
      healthStatus:
        input.fixed?.healthStatus ??
        rng.weighted([
          ["EXCELLENT", 30],
          ["GOOD", 50],
          ["ATTENTION", 15],
          ["URGENT", 5],
        ] as const),
      photoUrl: photos.length > 0 ? photo(photos[petIndex % photos.length]!) : null,
      notes: input.fixed?.notes ?? rng.pick(PET_NOTES),
      temperament: rng.sample(TEMPERAMENTS, rng.int(2, 4)),
      neutered: rng.bool(0.7),
      // Unique column. Deriving it from the index rather than drawing it means
      // a collision is impossible rather than merely unlikely.
      microchip: rng.bool(0.45) ? `981${String(petIndex).padStart(12, "0")}` : null,
      deceasedAt: deceased ? new Date(now.getTime() - rng.int(30, 600) * DAY_MS) : null,
      ownerId: pet.ownerId,
      custodianOrgId: pet.custodianOrgId,
    });

    return pet;
  }

  // --- Owned animals --------------------------------------------------------

  for (const fixed of HERO_PETS) {
    addPet({ owner: world.heroTutor, org: null, forAdoption: false, fixed });
  }

  for (let n = 0; n < FOSTER_PET_COUNT; n += 1) {
    addPet({ owner: world.fosterTutor, org: null, forAdoption: false });
  }

  // Everyone else stays within the FREE plan's three-animal cap, so the quota
  // card on /meus-pets reads as a real limit rather than as decoration.
  for (const tutor of world.tutors) {
    if (tutor.id === world.heroTutor.id || tutor.id === world.fosterTutor.id) continue;
    for (let n = 0; n < rng.int(1, 3); n += 1) {
      addPet({ owner: tutor, org: null, forAdoption: false });
    }
  }

  // --- Animals in custody ---------------------------------------------------

  const abrigoAmigo =
    world.shelters.find((org) => org.slug === "abrigo-amigo") ?? world.shelters[0]!;
  for (const fixed of HERO_SHELTER_PETS) {
    addPet({ owner: null, org: abrigoAmigo, forAdoption: true, fixed });
  }

  for (const shelter of world.shelters) {
    for (let n = 0; n < CUSTODY_PER_SHELTER; n += 1) {
      // A fifth are under a year old and a fifth are seniors, which is what
      // gives the adoption feed its PUPPY and URGENT bands something to sort.
      const ageMonths =
        n % 5 === 0 ? rng.int(2, 11) : n % 5 === 1 ? rng.int(85, 170) : rng.int(12, 84);
      addPet({ owner: null, org: shelter, ageMonths, forAdoption: true });
    }
  }

  // Clinics hold a few animals too — boarding, treatment, abandoned patients.
  // Without them the dashboard's "animais sob guarda" tile and the vaccination
  // panel are shelter-only, and half the `plus` accounts show zeroes.
  for (const clinic of world.clinics) {
    for (let n = 0; n < CUSTODY_PER_CLINIC; n += 1) {
      addPet({ owner: null, org: clinic, forAdoption: false });
    }
  }

  await insertMany(petRows, (batch) => db.pet.createMany({ data: batch, skipDuplicates: true }));

  const ownedPets = pets.filter((pet) => pet.ownerId !== null);
  const custodyPets = pets.filter((pet) => pet.custodianOrgId !== null);

  await seedVaccinations(ctx, { pets, custodyPets, ownedPets, clinics: world.clinics });
  await seedHealthRecords(ctx, {
    custodyPets,
    ownedPets,
    orgs: world.orgs,
    clinics: world.clinics,
  });
  await seedReminders(ctx, { custodyPets, ownedPets, orgs: world.orgs, tutors: world.tutors });

  return { pets, ownedPets, custodyPets };
}

// --- Clinical ---------------------------------------------------------------

/**
 * Vaccine doses.
 *
 * The `plus` dashboard's "vacinas a vencer" panel reads
 * `nextDoseAt <= now + 30d` **and** `pet.custodianOrgId = <this org>`, so an
 * overdue booster on a tutor's own animal never appears there. Every third
 * animal in custody therefore gets a dose that is late and every third gets one
 * that is nearly due, which is the only way the panel shows both of its states.
 */
async function seedVaccinations(
  ctx: SeedContext,
  input: { pets: DemoPet[]; custodyPets: DemoPet[]; ownedPets: DemoPet[]; clinics: DemoOrg[] },
): Promise<void> {
  const { db, rng, now } = ctx;

  const rows: Prisma.VaccinationCreateManyInput[] = [];
  let index = 0;

  input.custodyPets.forEach((pet, position) => {
    const doses = rng.int(1, 3);

    for (let n = 0; n < doses; n += 1) {
      const overdue = n === 0 && position % 3 === 0;
      const dueSoon = n === 0 && position % 3 === 1;

      const appliedDaysAgo = overdue
        ? rng.int(370, 420)
        : dueSoon
          ? rng.int(340, 360)
          : rng.int(20, 300);
      const nextInDays = overdue ? -rng.int(3, 60) : dueSoon ? rng.int(1, 29) : rng.int(60, 340);

      rows.push({
        id: id("vac", (index += 1)),
        petId: pet.id,
        orgId: pet.custodianOrgId,
        name: rng.pick(VACCINE_NAMES),
        appliedAt: dateOnlyFrom(now, -appliedDaysAgo),
        nextDoseAt: dateOnlyFrom(now, nextInDays),
        batch: `L${rng.int(100000, 999999)}`,
        veterinarian: rng.pick(VETERINARIANS),
        notes: null,
      });
    }
  });

  // Owned animals are vaccinated at a clinic, which is what makes them show up
  // as PATIENT rather than as somebody else's animal.
  input.ownedPets.forEach((pet, position) => {
    if (position % 3 === 2) return;

    rows.push({
      id: id("vac", (index += 1)),
      petId: pet.id,
      orgId: input.clinics[position % input.clinics.length]!.id,
      name: rng.pick(VACCINE_NAMES),
      appliedAt: dateOnlyFrom(now, -rng.int(30, 330)),
      nextDoseAt: dateOnlyFrom(now, rng.int(-40, 330)),
      batch: `L${rng.int(100000, 999999)}`,
      veterinarian: rng.pick(VETERINARIANS),
      notes: null,
    });
  });

  // Rex's history from the prototype's VaccineManager, kept intact.
  const rex = input.pets.find((pet) => pet.name === "Rex");
  if (rex) {
    rows.push(
      {
        id: id("vac", (index += 1)),
        petId: rex.id,
        orgId: null,
        name: "Antirrábica",
        appliedAt: dateOnly(new Date(now.getFullYear() - 1, 5, 15)),
        nextDoseAt: dateOnly(new Date(now.getFullYear(), 5, 15)),
        batch: "L482910",
        veterinarian: "Dra. Helena Prado",
        notes: null,
      },
      {
        id: id("vac", (index += 1)),
        petId: rex.id,
        orgId: null,
        name: "V10",
        appliedAt: dateOnlyFrom(now, -320),
        nextDoseAt: dateOnlyFrom(now, 45),
        batch: "L771204",
        veterinarian: "Dra. Helena Prado",
        notes: null,
      },
    );
  }

  await insertMany(rows, (batch) =>
    db.vaccination.createMany({ data: batch, skipDuplicates: true }),
  );
}

async function seedHealthRecords(
  ctx: SeedContext,
  input: { custodyPets: DemoPet[]; ownedPets: DemoPet[]; orgs: DemoOrg[]; clinics: DemoOrg[] },
): Promise<void> {
  const { db, rng, now } = ctx;

  const byId = new Map(input.orgs.map((org) => [org.id, org]));
  const rows: Prisma.HealthRecordCreateManyInput[] = [];
  let index = 0;

  for (const pet of input.custodyPets) {
    const org = byId.get(pet.custodianOrgId!)!;

    for (let n = 0; n < rng.int(1, 3); n += 1) {
      rows.push({
        id: id("hlt", (index += 1)),
        petId: pet.id,
        orgId: org.id,
        authorId: org.ownerId,
        recordedAt: new Date(now.getTime() - rng.int(2, 400) * DAY_MS),
        weightKg: weightFor(rng, pet.species, null),
        temperatureC: rng.float(37.5, 39.4, 2).toFixed(2),
        symptoms: rng.pick(HEALTH_SYMPTOMS),
        notes: rng.pick(HEALTH_NOTES),
      });
    }
  }

  // Only a third of owned animals have a clinical history — a tutor whose every
  // pet has a file would misrepresent how the consumer app is actually used.
  input.ownedPets.forEach((pet, position) => {
    if (position % 3 !== 0) return;
    const clinic = input.clinics[position % input.clinics.length]!;

    rows.push({
      id: id("hlt", (index += 1)),
      petId: pet.id,
      orgId: clinic.id,
      authorId: clinic.ownerId,
      recordedAt: new Date(now.getTime() - rng.int(2, 300) * DAY_MS),
      weightKg: weightFor(rng, pet.species, null),
      temperatureC: rng.float(37.5, 39.4, 2).toFixed(2),
      symptoms: rng.pick(HEALTH_SYMPTOMS),
      notes: rng.pick(HEALTH_NOTES),
    });
  });

  await insertMany(rows, (batch) =>
    db.healthRecord.createMany({ data: batch, skipDuplicates: true }),
  );
}

/**
 * Reminders belong to whoever will see them.
 *
 * `reminder.list` scopes on the signed-in user, not on the organization — so a
 * reminder about a shelter animal has to be owned by the person who signs into
 * that shelter, or the tab on `plus /animais/[id]` is empty however many rows
 * exist.
 */
async function seedReminders(
  ctx: SeedContext,
  input: { custodyPets: DemoPet[]; ownedPets: DemoPet[]; orgs: DemoOrg[]; tutors: DemoUser[] },
): Promise<void> {
  const { db, rng, now } = ctx;

  const byId = new Map(input.orgs.map((org) => [org.id, org]));
  const rows: Prisma.ReminderCreateManyInput[] = [];
  let index = 0;

  input.custodyPets.forEach((pet, position) => {
    if (position % 2 !== 0) return;
    const org = byId.get(pet.custodianOrgId!)!;
    const template = REMINDER_TEMPLATES[position % REMINDER_TEMPLATES.length]!;
    const daysFromNow = rng.int(-10, 40);

    rows.push({
      id: id("rem", (index += 1)),
      userId: org.ownerId,
      petId: pet.id,
      type: template.type as Prisma.ReminderCreateManyInput["type"],
      title: `${template.title} — ${pet.name}`,
      description: template.description,
      dueAt: new Date(now.getTime() + daysFromNow * DAY_MS),
      // Past-due reminders that are still open are the interesting case; a
      // handful are closed so the "incluir concluídos" toggle does something.
      completedAt: daysFromNow < 0 && position % 6 === 0 ? new Date(now.getTime() - DAY_MS) : null,
    });
  });

  input.ownedPets.forEach((pet, position) => {
    if (position % 4 !== 0) return;
    const template = REMINDER_TEMPLATES[position % REMINDER_TEMPLATES.length]!;

    rows.push({
      id: id("rem", (index += 1)),
      userId: pet.ownerId!,
      petId: pet.id,
      type: template.type as Prisma.ReminderCreateManyInput["type"],
      title: `${template.title} — ${pet.name}`,
      description: template.description,
      dueAt: new Date(now.getTime() + rng.int(-5, 45) * DAY_MS),
      completedAt: null,
    });
  });

  await insertMany(rows, (batch) => db.reminder.createMany({ data: batch, skipDuplicates: true }));
}

// --- Helpers ----------------------------------------------------------------

function sizeFor(rng: Rng, species: Species): "SMALL" | "MEDIUM" | "LARGE" {
  if (species === "DOG") {
    return rng.weighted([
      ["SMALL", 3],
      ["MEDIUM", 4],
      ["LARGE", 3],
    ] as const);
  }
  if (species === "CAT")
    return rng.weighted([
      ["SMALL", 3],
      ["MEDIUM", 2],
    ] as const);
  return "SMALL";
}

/** A Decimal(5,2) as a string, which is how Prisma wants it without a BigNumber. */
function weightFor(rng: Rng, species: Species, size: "SMALL" | "MEDIUM" | "LARGE" | null): string {
  const [min, max] = WEIGHT_RANGE[species];

  if (species === "DOG" && size) {
    const bands: Record<string, [number, number]> = {
      SMALL: [3, 10],
      MEDIUM: [10, 25],
      LARGE: [25, 42],
    };
    const [low, high] = bands[size]!;
    return rng.float(low, high, 2).toFixed(2);
  }

  return rng.float(min, max, 2).toFixed(2);
}

/**
 * Names repeat across a population this size — there are only so many things
 * anyone calls a dog — so the pool is cycled and suffixed rather than drawn at
 * random, which keeps "Luna" and "Luna II" apart in a list.
 */
function uniquePetName(index: number): string {
  const base = PET_NAMES[index % PET_NAMES.length]!;
  const round = Math.floor(index / PET_NAMES.length);
  return round === 0 ? base : `${base} ${["II", "III", "IV", "V"][round - 1] ?? round + 1}`;
}
