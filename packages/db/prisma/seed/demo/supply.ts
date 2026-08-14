import { insertMany, phoneFor } from "../context.ts";
import {
  CITIES,
  CLIENT_NOTES,
  FIRST_NAMES,
  LAST_NAMES,
  NEIGHBOURHOODS,
  OFFERINGS,
  ORGANIZATIONS,
  ORG_PHOTO_IDS,
  PHOTOS_BY_SPECIES,
  STREETS,
  photo,
} from "../fixtures.ts";
import { id } from "../ids.ts";
import { DAY_MS, scatter } from "../rng.ts";

import type {
  DemoClientContact,
  DemoOffering,
  DemoOrg,
  DemoUser,
  OrgType,
  SeedContext,
  ServiceType,
} from "../context.ts";
import type { Prisma } from "../../../src/index.ts";

/**
 * The supply side — organizations, who staffs them, what they sell and who
 * walks in off the street.
 */

/** Which kinds of provider plausibly sell each service. */
const ELIGIBLE_ORG_TYPES: Record<ServiceType, OrgType[]> = {
  PET_SITTER: ["INDEPENDENT"],
  DOG_WALKER: ["INDEPENDENT"],
  DAYCARE: ["INDEPENDENT", "PETSHOP"],
  HOTEL: ["INDEPENDENT", "PETSHOP"],
  GROOMING: ["PETSHOP", "CLINIC", "INDEPENDENT"],
  VET_CONSULT: ["CLINIC"],
  VACCINATION: ["CLINIC", "SHELTER"],
  TRAINING: ["INDEPENDENT"],
  TRANSPORT: ["INDEPENDENT", "PETSHOP"],
  OTHER: ["CLINIC", "INDEPENDENT"],
};

/**
 * Offerings per service type.
 *
 * Fixed rather than random, because `/servicos` is four tabs keyed to four of
 * these and the point of the seed is that none of them is empty. Eight is also
 * enough for the tab to scroll, which is the only way to tell whether the card
 * list actually works.
 */
const OFFERINGS_PER_TYPE = 8;

/**
 * Verification states, assigned by position so all four are guaranteed.
 *
 * `plus /organizacao` renders a different card for each, and three of the four
 * were unreachable before: the old seed left one org PENDING and every other
 * one at the NOT_SUBMITTED default.
 */
const VERIFICATION_PLAN: ("APPROVED" | "PENDING" | "REJECTED" | "NOT_SUBMITTED")[] = [
  "PENDING", // abrigo-amigo — as the previous seed had it
  "APPROVED",
  "APPROVED",
  "NOT_SUBMITTED",
  "APPROVED",
  "APPROVED",
  "REJECTED",
  "APPROVED",
  "PENDING",
  "NOT_SUBMITTED",
  "APPROVED",
  "APPROVED",
  "NOT_SUBMITTED",
  "PENDING",
  "APPROVED", // pet-care-silva
  "APPROVED", // passeios-do-joao
  "REJECTED",
  "NOT_SUBMITTED",
  "PENDING",
  "NOT_SUBMITTED",
];

const REJECTION_REASONS = [
  "Comprovante de endereço ilegível. Reenvie uma foto com melhor resolução.",
  "O documento enviado está vencido. Envie um documento válido para reanálise.",
];

const CLIENT_CONTACT_COUNT = 120;

export interface SupplyResult {
  orgs: DemoOrg[];
  shelters: DemoOrg[];
  clinics: DemoOrg[];
  offerings: DemoOffering[];
  clientContacts: DemoClientContact[];
}

export async function seedSupply(
  ctx: SeedContext,
  people: { users: DemoUser[]; providers: DemoUser[] },
): Promise<SupplyResult> {
  const { db, rng, now } = ctx;

  const byEmail = new Map(people.users.map((user) => [user.email, user]));

  // The three organizations the README's demo accounts sign into keep their
  // owners; the rest are handed to the generated providers in order.
  const heroOwners: Record<string, string> = {
    "pet-care-silva": byEmail.get("maria.silva@email.com")!.id,
    "passeios-do-joao": byEmail.get("joao.santos@email.com")!.id,
    "abrigo-amigo": byEmail.get("contato@abrigoamigo.org")!.id,
  };

  const spareProviders = people.providers.filter((user) => !user.isHero);
  let spareIndex = 0;

  const orgs: DemoOrg[] = ORGANIZATIONS.map((template, index) => {
    const ownerId =
      heroOwners[template.slug] ?? spareProviders[spareIndex++ % spareProviders.length]!.id;

    return {
      id: id("org", index + 1),
      slug: template.slug,
      name: template.name,
      type: template.type,
      // Shelters and clinics sit in the capital and its ring, so the /adocao
      // feed has a dense São Paulo cluster; the rest spread out.
      city: index % 4 === 3 ? rng.pick(CITIES) : rng.pick(CITIES.slice(0, 6)),
      ownerId,
      memberIds: [ownerId],
    };
  });

  const orgRows: Prisma.OrganizationCreateManyInput[] = orgs.map((org, index) => {
    const template = ORGANIZATIONS[index]!;
    const point = scatter(rng, org.city.lat, org.city.lng, 12);

    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      type: org.type,
      description: template.description,
      avatarUrl: photo(ORG_PHOTO_IDS[index % ORG_PHOTO_IDS.length]!, 400, 400),
      phone: phoneFor(rng, org.city),
      email: `contato@${org.slug.replace(/-/g, "")}.com.br`,
      addressLine: `${rng.pick(STREETS)}, ${rng.int(10, 1800)} — ${rng.pick(NEIGHBOURHOODS)}`,
      city: org.city.name,
      state: org.city.state,
      postalCode: `0${rng.int(1000, 9999)}-${rng.int(100, 999)}`,
      latitude: point.lat,
      longitude: point.lng,
      verificationStatus: VERIFICATION_PLAN[index]!,
      // ratingAvg / ratingCount are left at zero and recomputed from the seeded
      // reviews in derive.ts. Writing prototype numbers here and reviews there
      // would leave the two disagreeing the moment anyone looked.
    };
  });

  await insertMany(orgRows, (batch) =>
    db.organization.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- Membership -----------------------------------------------------------

  const memberRows: Prisma.OrganizationMemberCreateManyInput[] = [];
  let memberIndex = 1;

  for (const org of orgs) {
    memberRows.push({
      id: id("mem", memberIndex++),
      orgId: org.id,
      userId: org.ownerId,
      role: "OWNER",
    });
  }

  // Maria owns Pet Care Silva and also helps run the grooming salon. She is the
  // only reason the organization switcher in the `plus` header renders as a
  // list rather than as a single static name.
  const maria = byEmail.get("maria.silva@email.com")!;
  const salon = orgs.find((org) => org.slug === "banho-e-tosa-da-vila")!;
  memberRows.push({
    id: id("mem", memberIndex++),
    orgId: salon.id,
    userId: maria.id,
    role: "ADMIN",
  });
  salon.memberIds.push(maria.id);

  // Providers left over after every organization has an owner become staff, so
  // the team list on /organizacao is not one row everywhere.
  for (const provider of spareProviders.slice(spareIndex)) {
    const org = rng.pick(orgs.filter((candidate) => candidate.type !== "INDEPENDENT"));
    if (org.memberIds.includes(provider.id)) continue;

    memberRows.push({
      id: id("mem", memberIndex++),
      orgId: org.id,
      userId: provider.id,
      role: rng.weighted([
        ["STAFF", 3],
        ["ADMIN", 1],
      ] as const),
    });
    org.memberIds.push(provider.id);
  }

  await insertMany(memberRows, (batch) =>
    db.organizationMember.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- Verification documents ----------------------------------------------

  const verificationRows: Prisma.ProviderVerificationCreateManyInput[] = [];
  let verificationIndex = 1;
  let rejectionIndex = 0;

  orgs.forEach((org, index) => {
    const status = VERIFICATION_PLAN[index]!;
    // NOT_SUBMITTED means exactly that: no row. An org with a row and that
    // status would be a state the application itself cannot produce.
    if (status === "NOT_SUBMITTED") return;

    const submittedAt = new Date(now.getTime() - rng.int(5, 240) * DAY_MS);

    verificationRows.push({
      id: id("ver", verificationIndex++),
      orgId: org.id,
      status,
      documentUrl: photo(ORG_PHOTO_IDS[index % ORG_PHOTO_IDS.length]!, 900, 600),
      addressProofUrl: photo(
        PHOTOS_BY_SPECIES.DOG![index % PHOTOS_BY_SPECIES.DOG!.length]!,
        900,
        600,
      ),
      certificatesUrl:
        status === "APPROVED"
          ? photo(ORG_PHOTO_IDS[(index + 1) % ORG_PHOTO_IDS.length]!, 900, 600)
          : null,
      experienceYears: rng.int(1, 18),
      experienceDescription: `Atuando desde ${new Date(now.getFullYear() - rng.int(1, 18), 0, 1).getFullYear()}, com equipe própria e atendimento contínuo.`,
      submittedAt,
      reviewedAt:
        status === "PENDING" ? null : new Date(submittedAt.getTime() + rng.int(1, 12) * DAY_MS),
      rejectionReason:
        status === "REJECTED"
          ? REJECTION_REASONS[rejectionIndex++ % REJECTION_REASONS.length]!
          : null,
    });
  });

  await insertMany(verificationRows, (batch) =>
    db.providerVerification.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- Offerings ------------------------------------------------------------

  const offerings: DemoOffering[] = [];
  let offeringIndex = 1;

  for (const template of OFFERINGS) {
    const eligible = orgs.filter((org) => ELIGIBLE_ORG_TYPES[template.type].includes(org.type));

    for (let n = 0; n < OFFERINGS_PER_TYPE; n += 1) {
      const org = eligible[n % eligible.length]!;
      const variant = Math.floor(n / eligible.length) % template.titles.length;

      offerings.push({
        id: id("off", offeringIndex),
        orgId: org.id,
        type: template.type,
        title: template.titles[variant]!,
        priceCents: rng.int(template.price[0] / 100, template.price[1] / 100) * 100,
        durationMinutes: template.durationMinutes,
        // A handful are hidden, so the Visível/Oculto toggle in `plus` has both
        // states on screen at once.
        isActive: offeringIndex % 10 !== 0,
      });

      offeringIndex += 1;
    }
  }

  const offeringRows: Prisma.ServiceOfferingCreateManyInput[] = offerings.map((offering, index) => {
    const template = OFFERINGS.find((entry) => entry.type === offering.type)!;

    return {
      id: offering.id,
      orgId: offering.orgId,
      type: offering.type,
      title: offering.title,
      description: template.descriptions[index % template.descriptions.length]!,
      priceCents: offering.priceCents,
      priceUnit: template.priceUnit,
      durationMinutes: offering.durationMinutes,
      isActive: offering.isActive,
      tags: rng.sample(template.tags, rng.int(1, Math.min(3, template.tags.length))),
      imageUrl: photo(ORG_PHOTO_IDS[index % ORG_PHOTO_IDS.length]!, 600, 400),
    };
  });

  await insertMany(offeringRows, (batch) =>
    db.serviceOffering.createMany({ data: batch, skipDuplicates: true }),
  );

  // --- Walk-in clients ------------------------------------------------------
  //
  // A ClientContact is a customer with no Animalesko account — the shape the
  // `plus` appointment form was really about. Every provider that sells a
  // service gets some, including the independents: a dog walker's neighbour who
  // texts to book a walk is exactly this row. Shelters are excluded because
  // their agenda is filled by the animals they hold, not by paying clients.

  const counterOrgs = orgs.filter((org) => org.type !== "SHELTER");

  const clientContacts: DemoClientContact[] = [];
  const phonesByOrg = new Map<string, Set<string>>();
  const contactRows: Prisma.ClientContactCreateManyInput[] = [];

  for (let n = 0; n < CLIENT_CONTACT_COUNT; n += 1) {
    const org = counterOrgs[n % counterOrgs.length]!;
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

    // `@@unique([orgId, phone])` — a repeat inside one org would abort the
    // whole batch, and at 120 rows a collision is not a remote possibility.
    const used = phonesByOrg.get(org.id) ?? new Set<string>();
    let phone = phoneFor(rng, org.city);
    while (used.has(phone)) phone = phoneFor(rng, org.city);
    used.add(phone);
    phonesByOrg.set(org.id, used);

    const contact: DemoClientContact = { id: id("cli", n + 1), orgId: org.id, name };
    clientContacts.push(contact);

    contactRows.push({
      id: contact.id,
      orgId: org.id,
      name,
      phone,
      email: rng.bool(0.6) ? `${name.split(" ")[0]!.toLowerCase()}.${n}@email.com` : null,
      notes: rng.pick(CLIENT_NOTES),
    });
  }

  await insertMany(contactRows, (batch) =>
    db.clientContact.createMany({ data: batch, skipDuplicates: true }),
  );

  return {
    orgs,
    shelters: orgs.filter((org) => org.type === "SHELTER"),
    clinics: orgs.filter((org) => org.type === "CLINIC"),
    offerings,
    clientContacts,
  };
}
