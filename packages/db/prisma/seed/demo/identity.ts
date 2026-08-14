import { hashPassword } from "better-auth/crypto";

import { insertMany, phoneFor, slugifyName } from "../context.ts";
import {
  AVATAR_PHOTO_IDS,
  CITIES,
  FIRST_NAMES,
  LAST_NAMES,
  STREETS,
  USER_BIOS,
  photo,
} from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS } from "../rng.ts";

import type { DemoUser, SeedContext } from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * The people.
 *
 * The four accounts the README documents are seeded first and by hand, at fixed
 * ids, because they are what a reviewer actually signs in as and because every
 * other generator anchors its most interesting rows on them. Everything after
 * them is generated.
 */

export const DEMO_PASSWORD = "animalesko123";

const TUTOR_COUNT = 37;
const PROVIDER_COUNT = 23;

interface HeroSpec {
  email: string;
  name: string;
  isProvider: boolean;
  bio: string;
  premium: boolean;
}

const HEROES: HeroSpec[] = [
  {
    email: "joao.silva@email.com",
    name: "João Silva",
    isProvider: false,
    bio: "Apaixonado por pets e sempre em busca dos melhores cuidados para meus companheiros de quatro patas!",
    premium: false,
  },
  {
    email: "maria.silva@email.com",
    name: "Maria Silva",
    isProvider: true,
    bio: "Cuido de pets em domicílio há oito anos, com foco em animais idosos.",
    premium: false,
  },
  {
    email: "joao.santos@email.com",
    name: "João Santos",
    isProvider: true,
    bio: "Dog walker certificado. Grupos pequenos, sempre no mesmo horário.",
    premium: false,
  },
  {
    email: "contato@abrigoamigo.org",
    name: "Abrigo Amigo",
    isProvider: true,
    bio: "ONG dedicada ao resgate e adoção responsável desde 2018.",
    premium: false,
  },
  // Not in the README, and deliberately unusual: the FREE plan caps a tutor at
  // three animals, so /meus-pets can only be paged past its 50-row window by
  // someone on PREMIUM. A foster home is the one kind of tutor for whom
  // fifty-five animals is not absurd.
  {
    email: "carla.menezes@email.com",
    name: "Carla Menezes",
    isProvider: false,
    bio: "Lar temporário. Já passaram mais de duzentos animais por aqui a caminho da adoção definitiva.",
    premium: true,
  },
];

export interface IdentityResult {
  users: DemoUser[];
  tutors: DemoUser[];
  providers: DemoUser[];
  heroTutor: DemoUser;
  fosterTutor: DemoUser;
}

export async function seedIdentity(ctx: SeedContext): Promise<IdentityResult> {
  const { db, rng, now } = ctx;

  const users: DemoUser[] = [];
  const bios = new Map<string, string | null>();
  const taken = new Set<string>();

  HEROES.forEach((hero, index) => {
    const user: DemoUser = {
      id: id("usr", index + 1),
      email: hero.email,
      name: hero.name,
      isTutor: !hero.isProvider,
      isProvider: hero.isProvider,
      city: CITIES[0]!,
      isHero: true,
      premium: hero.premium,
    };

    users.push(user);
    bios.set(user.id, hero.bio);
    taken.add(hero.email);
  });

  const heroTutors = HEROES.filter((hero) => !hero.isProvider).length;
  const heroProviders = HEROES.length - heroTutors;
  const generated = TUTOR_COUNT - heroTutors + (PROVIDER_COUNT - heroProviders);

  for (let n = 0; n < generated; n += 1) {
    const index = HEROES.length + n + 1;
    const isProvider = n >= TUTOR_COUNT - heroTutors;
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

    // The name pool is small enough that collisions are certain at this size
    // and `User.email` is unique, so the index — unique by construction — is
    // what actually disambiguates.
    const base = slugifyName(name);
    const email = taken.has(`${base}@email.com`)
      ? `${base}.${index}@email.com`
      : `${base}@email.com`;
    taken.add(email);

    const user: DemoUser = {
      id: id("usr", index),
      email,
      name,
      isTutor: !isProvider,
      isProvider,
      // Providers cluster around the capital, where the organizations are;
      // tutors are spread nationally so the /adocao state filter has work.
      city: isProvider ? rng.pick(CITIES.slice(0, 6)) : rng.pick(CITIES),
      isHero: false,
      premium: false,
    };

    users.push(user);
    bios.set(user.id, rng.pick(USER_BIOS));
  }

  const userRows: Prisma.UserCreateManyInput[] = users.map((user, index) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: true,
    image: photo(AVATAR_PHOTO_IDS[index % AVATAR_PHOTO_IDS.length]!, 400, 400),
    roles: user.isProvider ? ["PROVIDER"] : ["TUTOR"],
    phone: phoneFor(rng, user.city),
    bio: bios.get(user.id) ?? null,
    street: `${rng.pick(STREETS)}, ${rng.int(10, 1800)}`,
    city: user.city.name,
    state: user.city.state,
    postalCode: `0${rng.int(1000, 9999)}-${rng.int(100, 999)}`,
  }));

  await insertMany(userRows, (batch) => db.user.createMany({ data: batch, skipDuplicates: true }));

  // Every account signs in through the normal form, so the password is hashed
  // with Better Auth's own scrypt parameters. One hash reused for all of them:
  // scrypt is deliberately slow, and sixty of them is a visible pause.
  const demoHash = await hashPassword(DEMO_PASSWORD);

  const accountRows: Prisma.AccountCreateManyInput[] = users.map((user, index) => ({
    id: id("acc", index + 1),
    providerId: "credential",
    accountId: user.id,
    userId: user.id,
    password: demoHash,
  }));

  await insertMany(accountRows, (batch) =>
    db.account.createMany({ data: batch, skipDuplicates: true }),
  );

  // Better Auth creates this through a databaseHook on sign-up, which only
  // fires via the auth API — a direct write has to do it here or /perfil throws
  // on a missing profile. `points` and `level` stay at their defaults; derive.ts
  // fills them from the ledger, so no profile exists that no sequence of real
  // actions could have produced.
  const profileRows: Prisma.GamificationProfileCreateManyInput[] = users.map((user, index) => ({
    id: id("gam", index + 1),
    userId: user.id,
  }));

  await insertMany(profileRows, (batch) =>
    db.gamificationProfile.createMany({ data: batch, skipDuplicates: true }),
  );

  // The plan gate. Most tutors are FREE, which is what makes the quota card on
  // /meus-pets say anything at all; a handful are PREMIUM, and a couple sit in
  // the two states the subscription model has but nothing ever produces.
  const subscriptionRows: Prisma.SubscriptionCreateManyInput[] = users.map((user, index) => {
    const tier = user.premium
      ? "PREMIUM"
      : rng.weighted([
          ["FREE", 8],
          ["PREMIUM", 1],
        ] as const);
    const status = user.premium
      ? "ACTIVE"
      : rng.weighted([
          ["ACTIVE", 28],
          ["PAST_DUE", 1],
          ["CANCELLED", 1],
        ] as const);

    return {
      id: id("sub", index + 1),
      userId: user.id,
      tier,
      status,
      currentPeriodEnd:
        tier === "PREMIUM" ? new Date(now.getTime() + rng.int(3, 300) * DAY_MS) : null,
      gatewayRef: tier === "PREMIUM" ? `sub_demo_${String(index + 1).padStart(4, "0")}` : null,
    };
  });

  await insertMany(subscriptionRows, (batch) =>
    db.subscription.createMany({ data: batch, skipDuplicates: true }),
  );

  return {
    users,
    tutors: users.filter((user) => user.isTutor),
    providers: users.filter((user) => user.isProvider),
    heroTutor: users.find((user) => user.email === "joao.silva@email.com")!,
    fosterTutor: users.find((user) => user.email === "carla.menezes@email.com")!,
  };
}
