/**
 * Development seed.
 *
 * This is the mock data that was hardcoded across both prototypes — Rex and
 * Mimi from plus/Dashboard, Luna and Thor from app/Index, Maria Silva's Pet
 * Sitter and João Santos' Dog Walker offerings, the vaccine history, the
 * badges — turned into real rows so both apps have something to render.
 *
 * Idempotent: safe to re-run without duplicating anything.
 */
// Must precede any import that reads process.env.
import "../src/load-env.ts";

import { hashPassword } from "better-auth/crypto";

import { createPrismaClient } from "../src/index.ts";

const db = createPrismaClient(process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL);

const DEMO_PASSWORD = "animalesko123";

/** Creates a user plus the credentials account Better Auth signs them in with. */
async function upsertUser(input: {
  email: string;
  name: string;
  roles: ("TUTOR" | "PROVIDER" | "ADMIN")[];
  phone?: string;
  city?: string;
  state?: string;
  bio?: string;
}) {
  const user = await db.user.upsert({
    where: { email: input.email },
    update: { name: input.name, roles: input.roles },
    create: {
      email: input.email,
      name: input.name,
      emailVerified: true,
      roles: input.roles,
      phone: input.phone ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      bio: input.bio ?? null,
    },
  });

  // Hashed with Better Auth's own scrypt parameters, so these accounts are
  // usable through the normal sign-in form rather than only via the seed.
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    update: { password: passwordHash },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  await db.gamificationProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
}

async function main() {
  console.info("Seeding Animalesko…");

  // --- Badges (from app/hooks/useGamification.tsx) --------------------------
  const badges = [
    {
      code: "first_adoption",
      name: "Primeira Adoção",
      icon: "🏆",
      description: "Adotou seu primeiro pet",
    },
    {
      code: "reviewer",
      name: "Avaliador",
      icon: "⭐",
      description: "Avaliou 5 prestadores",
    },
    {
      code: "favorite_collector",
      name: "Colecionador",
      icon: "💚",
      description: "Favoritou 10 pets",
    },
    {
      code: "alert_hero",
      name: "Herói do Alert",
      icon: "🚨",
      description: "Ajudou 3 pets perdidos",
    },
  ];

  for (const badge of badges) {
    await db.badge.upsert({
      where: { code: badge.code },
      update: badge,
      create: badge,
    });
  }

  // --- People ---------------------------------------------------------------
  const tutor = await upsertUser({
    email: "joao.silva@email.com",
    name: "João Silva",
    roles: ["TUTOR"],
    phone: "(11) 98765-4321",
    city: "São Paulo",
    state: "SP",
    bio: "Apaixonado por pets e sempre em busca dos melhores cuidados para meus companheiros de quatro patas!",
  });

  const sitter = await upsertUser({
    email: "maria.silva@email.com",
    name: "Maria Silva",
    roles: ["PROVIDER"],
    phone: "(11) 99999-1111",
    city: "São Paulo",
    state: "SP",
  });

  const walker = await upsertUser({
    email: "joao.santos@email.com",
    name: "João Santos",
    roles: ["PROVIDER"],
    phone: "(11) 99999-2222",
    city: "São Paulo",
    state: "SP",
  });

  const shelterAdmin = await upsertUser({
    email: "contato@abrigoamigo.org",
    name: "Abrigo Amigo",
    roles: ["PROVIDER"],
    phone: "(11) 99999-3333",
    city: "São Paulo",
    state: "SP",
  });

  // --- Organizations (the supply side administered in apps/plus) ------------
  const petCare = await db.organization.upsert({
    where: { slug: "pet-care-silva" },
    update: {},
    create: {
      slug: "pet-care-silva",
      name: "Pet Care Silva",
      type: "INDEPENDENT",
      description: "Cuidado especializado para seu pet em casa, com muito carinho e atenção.",
      phone: "(11) 99999-1111",
      city: "São Paulo",
      state: "SP",
      verificationStatus: "APPROVED",
      ratingAvg: 4.8,
      ratingCount: 24,
      members: { create: { userId: sitter.id, role: "OWNER" } },
    },
  });

  const walkerOrg = await db.organization.upsert({
    where: { slug: "passeios-do-joao" },
    update: {},
    create: {
      slug: "passeios-do-joao",
      name: "Passeios do João",
      type: "INDEPENDENT",
      description: "Passeios diários para manter seu cãozinho feliz e saudável.",
      phone: "(11) 99999-2222",
      city: "São Paulo",
      state: "SP",
      verificationStatus: "APPROVED",
      ratingAvg: 4.9,
      ratingCount: 41,
      members: { create: { userId: walker.id, role: "OWNER" } },
    },
  });

  const shelter = await db.organization.upsert({
    where: { slug: "abrigo-amigo" },
    update: {},
    create: {
      slug: "abrigo-amigo",
      name: "Abrigo Amigo",
      type: "SHELTER",
      description: "ONG dedicada ao resgate e adoção responsável.",
      phone: "(11) 99999-3333",
      city: "São Paulo",
      state: "SP",
      verificationStatus: "APPROVED",
      members: { create: { userId: shelterAdmin.id, role: "OWNER" } },
    },
  });

  // --- Service offerings ----------------------------------------------------
  const offerings = [
    {
      orgId: petCare.id,
      type: "PET_SITTER" as const,
      title: "Pet Sitter",
      description: "Cuidado especializado para seu pet em casa, com muito carinho e atenção.",
      priceCents: 4500,
      priceUnit: "PER_DAY" as const,
      durationMinutes: 480,
      tags: ["Experiente", "Emergência"],
    },
    {
      orgId: walkerOrg.id,
      type: "DOG_WALKER" as const,
      title: "Dog Walker",
      description: "Passeios diários para manter seu cãozinho feliz e saudável.",
      priceCents: 2500,
      priceUnit: "PER_WALK" as const,
      durationMinutes: 60,
      tags: ["Matutino", "Vespertino"],
    },
  ];

  /** Offering id by title, for the bookings seeded further down. */
  const offeringIdByTitle = new Map<string, string>();

  for (const offering of offerings) {
    const existing = await db.serviceOffering.findFirst({
      where: { orgId: offering.orgId, title: offering.title },
      select: { id: true },
    });

    const id = existing
      ? (await db.serviceOffering.update({ where: { id: existing.id }, data: offering })).id
      : (await db.serviceOffering.create({ data: offering })).id;

    offeringIdByTitle.set(offering.title, id);
  }

  // --- The tutor's own pets -------------------------------------------------
  const ownedPets = [
    {
      name: "Rex",
      species: "DOG" as const,
      breed: "Golden Retriever",
      sex: "MALE" as const,
      size: "LARGE" as const,
      birthDate: new Date("2021-03-15"),
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
      birthDate: new Date("2022-07-20"),
      weightKg: "4.00",
      healthStatus: "EXCELLENT" as const,
      notes: "Gata tranquila, prefere ambientes silenciosos.",
    },
  ];

  /** The tutor's pet ids by name, for the bookings and alerts seeded below. */
  const ownedPetIdByName = new Map<string, string>();

  for (const pet of ownedPets) {
    const existing = await db.pet.findFirst({
      where: { ownerId: tutor.id, name: pet.name },
      select: { id: true },
    });

    const petId = existing
      ? (await db.pet.update({ where: { id: existing.id }, data: pet })).id
      : (await db.pet.create({ data: { ...pet, ownerId: tutor.id } })).id;

    ownedPetIdByName.set(pet.name, petId);

    // Vaccine history from plus/VaccineManager.
    if (pet.name === "Rex") {
      for (const vaccine of [
        { name: "Antirrábica", appliedAt: "2025-06-15", nextDoseAt: "2026-06-15" },
        { name: "V10", appliedAt: "2025-05-20", nextDoseAt: "2025-08-20" },
      ]) {
        const found = await db.vaccination.findFirst({
          where: { petId, name: vaccine.name },
          select: { id: true },
        });
        if (!found) {
          await db.vaccination.create({
            data: {
              petId,
              orgId: petCare.id,
              name: vaccine.name,
              appliedAt: new Date(vaccine.appliedAt),
              nextDoseAt: new Date(vaccine.nextDoseAt),
            },
          });
        }
      }
    }
  }

  // --- Adoption listings (shelter animals, no owner yet) --------------------
  const listings = [
    {
      pet: {
        name: "Luna",
        species: "DOG" as const,
        breed: "Golden Retriever",
        sex: "FEMALE" as const,
        size: "LARGE" as const,
        birthDate: new Date("2024-08-01"),
        temperament: ["Carinhosa", "Brincalhona", "Sociável"],
        neutered: true,
      },
      listing: {
        summary:
          "Luna é uma cachorrinha muito carinhosa e brincalhona, adora crianças e outros pets.",
        story:
          "Resgatada ainda filhote, Luna se recuperou completamente e agora procura uma família definitiva.",
        city: "São Paulo",
        state: "SP",
        urgency: "READY" as const,
      },
    },
    {
      pet: {
        name: "Thor",
        species: "DOG" as const,
        breed: "Vira-lata",
        sex: "MALE" as const,
        size: "MEDIUM" as const,
        birthDate: new Date("2025-06-10"),
        temperament: ["Energético", "Leal"],
        neutered: false,
      },
      listing: {
        summary: "Thor é um cãozinho energético e leal, perfeito para famílias ativas.",
        story: "Thor foi encontrado na rua e está pronto para um lar cheio de aventuras.",
        city: "Rio de Janeiro",
        state: "RJ",
        urgency: "PUPPY" as const,
      },
    },
    // Two animals the prototypes never had. With only Luna and Thor, "Pet do
    // Dia" alternates between the same pair and "outros pets do abrigo" is
    // always empty, so neither feature can actually be judged.
    {
      pet: {
        name: "Nina",
        species: "CAT" as const,
        breed: "SRD",
        sex: "FEMALE" as const,
        size: "SMALL" as const,
        birthDate: new Date("2023-02-14"),
        temperament: ["Independente", "Curiosa"],
        neutered: true,
      },
      listing: {
        summary: "Nina é discreta, limpinha e adora uma janela ensolarada.",
        story:
          "Nina chegou ao abrigo depois que sua tutora idosa faleceu. Levou meses para voltar a confiar em gente, e hoje procura uma casa calma.",
        city: "São Paulo",
        state: "SP",
        urgency: "READY" as const,
      },
    },
    {
      pet: {
        name: "Bidu",
        species: "DOG" as const,
        breed: "Beagle",
        sex: "MALE" as const,
        size: "MEDIUM" as const,
        birthDate: new Date("2018-11-05"),
        temperament: ["Dócil", "Companheiro", "Tranquilo"],
        neutered: true,
      },
      listing: {
        summary: "Bidu tem 7 anos, é dócil e está há mais tempo no abrigo do que qualquer outro.",
        story:
          "Cães idosos são os últimos a serem adotados. Bidu é saudável, já vive bem com outros cães e pede pouco além de companhia.",
        city: "São Paulo",
        state: "SP",
        urgency: "URGENT" as const,
      },
    },
  ];

  /** Listing id by pet name, for the favourites seeded below. */
  const listingIdByPetName = new Map<string, string>();

  for (const entry of listings) {
    const existing = await db.pet.findFirst({
      where: { custodianOrgId: shelter.id, name: entry.pet.name },
      select: { id: true },
    });

    const petId = existing
      ? existing.id
      : (await db.pet.create({ data: { ...entry.pet, custodianOrgId: shelter.id } })).id;

    const listing = await db.adoptionListing.upsert({
      where: { petId },
      update: entry.listing,
      create: {
        ...entry.listing,
        petId,
        orgId: shelter.id,
        status: "AVAILABLE",
        publishedAt: new Date(),
      },
      select: { id: true },
    });

    listingIdByPetName.set(entry.pet.name, listing.id);
  }

  // --- Bookings, payments and a review --------------------------------------
  //
  // The service-history screen has four tabs; without a row in each of them
  // three of the four render their empty state and the screen cannot be
  // compared against the prototype. Dates are relative to the seed run so the
  // "futuros" / "realizados" split stays correct however long the data sits.

  const petSitterId = offeringIdByTitle.get("Pet Sitter")!;
  const dogWalkerId = offeringIdByTitle.get("Dog Walker")!;
  const rexId = ownedPetIdByName.get("Rex")!;
  const mimiId = ownedPetIdByName.get("Mimi")!;

  const seededBookings = [
    {
      code: "ANM-7QK4D2",
      status: "COMPLETED" as const,
      offeringId: dogWalkerId,
      orgId: walkerOrg.id,
      petId: rexId,
      daysFromNow: -12,
      durationHours: 1,
      priceCents: 2500,
      notes: "Passeio no parque, Rex adorou.",
      payment: { method: "PIX" as const, status: "PAID" as const },
      review: { rating: 5, comment: "João é pontual e manda foto do passeio. Recomendo demais!" },
    },
    {
      code: "ANM-3XB8N5",
      status: "COMPLETED" as const,
      offeringId: petSitterId,
      orgId: petCare.id,
      petId: mimiId,
      daysFromNow: -30,
      durationHours: 72,
      priceCents: 13500,
      notes: "Viagem de fim de semana.",
      payment: { method: "CREDIT_CARD" as const, status: "PAID" as const },
      review: null,
    },
    {
      code: "ANM-9WT2H7",
      status: "CONFIRMED" as const,
      offeringId: dogWalkerId,
      orgId: walkerOrg.id,
      petId: rexId,
      daysFromNow: 2,
      durationHours: 1,
      priceCents: 2500,
      notes: null,
      payment: { method: "PIX" as const, status: "PAID" as const },
      review: null,
    },
    {
      code: "ANM-5RM6C1",
      status: "PENDING" as const,
      offeringId: petSitterId,
      orgId: petCare.id,
      petId: mimiId,
      daysFromNow: 9,
      durationHours: 48,
      priceCents: 9000,
      notes: "Mimi precisa de ração específica, levo junto.",
      payment: null,
      review: null,
    },
    {
      code: "ANM-1JD4K8",
      status: "CANCELLED" as const,
      offeringId: dogWalkerId,
      orgId: walkerOrg.id,
      petId: rexId,
      daysFromNow: -5,
      durationHours: 1,
      priceCents: 2500,
      notes: null,
      payment: null,
      review: null,
    },
  ];

  for (const entry of seededBookings) {
    const startsAt = new Date(Date.now() + entry.daysFromNow * 86_400_000);
    const endsAt = new Date(startsAt.getTime() + entry.durationHours * 3_600_000);

    const booking = await db.booking.upsert({
      where: { code: entry.code },
      update: { status: entry.status, startsAt, endsAt },
      create: {
        code: entry.code,
        status: entry.status,
        startsAt,
        endsAt,
        priceCents: entry.priceCents,
        notes: entry.notes,
        tutorId: tutor.id,
        petId: entry.petId,
        offeringId: entry.offeringId,
        orgId: entry.orgId,
        ...(entry.status === "CANCELLED"
          ? { cancelledAt: new Date(), cancellationReason: "Mudança de planos." }
          : {}),
      },
      select: { id: true },
    });

    // The provider's side of the same booking — what apps/plus reads.
    const appointment = await db.appointment.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });

    if (!appointment) {
      await db.appointment.create({
        data: {
          bookingId: booking.id,
          orgId: entry.orgId,
          petId: entry.petId,
          tutorId: tutor.id,
          serviceOfferingId: entry.offeringId,
          serviceLabel: entry.offeringId === dogWalkerId ? "Dog Walker" : "Pet Sitter",
          scheduledAt: startsAt,
          durationMinutes: entry.durationHours * 60,
          status:
            entry.status === "COMPLETED"
              ? "COMPLETED"
              : entry.status === "CANCELLED"
                ? "CANCELLED"
                : entry.status === "CONFIRMED"
                  ? "CONFIRMED"
                  : "PENDING",
        },
      });
    }

    if (entry.payment) {
      await db.payment.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          amountCents: entry.priceCents,
          method: entry.payment.method,
          status: entry.payment.status,
          paidAt: entry.payment.status === "PAID" ? startsAt : null,
        },
      });
    }

    if (entry.review) {
      await db.review.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          authorId: tutor.id,
          orgId: entry.orgId,
          rating: entry.review.rating,
          comment: entry.review.comment,
        },
      });
    }
  }

  // Keep the denormalised rating columns honest: the org rows above were
  // seeded with prototype numbers (4.8 / 24), and a seeded review that did not
  // move them would leave the two disagreeing the moment anyone looked.
  for (const orgId of [petCare.id, walkerOrg.id, shelter.id]) {
    const aggregate = await db.review.aggregate({
      where: { orgId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    if (aggregate._count._all > 0) {
      await db.organization.update({
        where: { id: orgId },
        data: { ratingAvg: aggregate._avg.rating ?? 0, ratingCount: aggregate._count._all },
      });
    }
  }

  // --- Favourites -----------------------------------------------------------
  const favoriteListingId = listingIdByPetName.get("Thor")!;

  await db.favoriteListing.upsert({
    where: { userId_listingId: { userId: tutor.id, listingId: favoriteListingId } },
    update: {},
    create: { userId: tutor.id, listingId: favoriteListingId },
  });

  await db.favoriteOffering.upsert({
    where: { userId_offeringId: { userId: tutor.id, offeringId: petSitterId } },
    update: {},
    create: { userId: tutor.id, offeringId: petSitterId },
  });

  // --- Notifications --------------------------------------------------------
  //
  // The four from app/Index.tsx, with the `action: () => void` closures each
  // carried replaced by an href — a callback cannot be stored or delivered to a
  // second device, which is the whole reason these are rows now.

  const notifications = [
    {
      type: "SERVICE" as const,
      title: "Agendamento confirmado",
      body: "Seu agendamento de Dog Walker está confirmado.",
      href: "/historico",
      hoursAgo: 2,
      read: false,
    },
    {
      type: "ADOPTION" as const,
      title: "Novo pet disponível!",
      body: "Nina, gata de 2 anos, está disponível para adoção.",
      href: "/adocao",
      hoursAgo: 5,
      read: false,
    },
    {
      type: "ADOPTION" as const,
      title: "Atualização de adoção",
      body: "Seu pedido de adoção foi atualizado para 'em análise'.",
      href: "/perfil",
      hoursAgo: 30,
      read: true,
    },
    {
      type: "REMINDER" as const,
      title: "Lembrete de serviço",
      body: "Pet Sitter da Mimi começa em poucos dias.",
      href: "/historico",
      hoursAgo: 8,
      read: false,
    },
  ];

  for (const entry of notifications) {
    const createdAt = new Date(Date.now() - entry.hoursAgo * 3_600_000);

    const existing = await db.notification.findFirst({
      where: { userId: tutor.id, title: entry.title },
      select: { id: true },
    });

    if (!existing) {
      await db.notification.create({
        data: {
          userId: tutor.id,
          type: entry.type,
          title: entry.title,
          body: entry.body,
          href: entry.href,
          createdAt,
          readAt: entry.read ? createdAt : null,
        },
      });
    }
  }

  // --- Lost-pet alerts ------------------------------------------------------
  // Coordinates around central São Paulo, so the map has something to plot for
  // anyone whose browser geolocation lands in the city.

  const alerts = [
    {
      name: "Pretinha",
      species: "DOG" as const,
      breed: "Vira-lata",
      description:
        "Cadela preta de porte médio, coleira vermelha, muito medrosa. Sumiu durante a chuva forte de terça.",
      lastSeenLat: -23.5629,
      lastSeenLng: -46.6544,
      lastSeenAddress: "Av. Paulista, próximo ao MASP",
      daysAgo: 3,
      contactName: "Ana Souza",
      contactPhone: "(11) 98888-1234",
    },
    {
      name: "Simba",
      species: "CAT" as const,
      breed: "Laranja rajado",
      description: "Gato laranja, castrado, sem coleira. Costuma responder ao nome.",
      lastSeenLat: -23.5505,
      lastSeenLng: -46.6333,
      lastSeenAddress: "Praça da Sé",
      daysAgo: 8,
      contactName: "Carlos Lima",
      contactPhone: "(11) 97777-5678",
    },
  ];

  for (const entry of alerts) {
    const existing = await db.lostPetAlert.findFirst({
      where: { reporterId: tutor.id, name: entry.name },
      select: { id: true },
    });

    if (!existing) {
      const { daysAgo, ...data } = entry;

      await db.lostPetAlert.create({
        data: {
          ...data,
          reporterId: tutor.id,
          status: "LOST",
          lastSeenAt: new Date(Date.now() - daysAgo * 86_400_000),
        },
      });
    }
  }

  // --- A conversation with the shelter --------------------------------------
  const thorListingId = listingIdByPetName.get("Thor")!;

  let conversation = await db.conversation.findFirst({
    where: { orgId: shelter.id, participants: { some: { userId: tutor.id } } },
    select: { id: true },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        orgId: shelter.id,
        listingId: thorListingId,
        participants: {
          create: [
            { userId: tutor.id, lastReadAt: new Date(Date.now() - 3_600_000) },
            { userId: shelterAdmin.id },
          ],
        },
      },
      select: { id: true },
    });

    const thread = [
      {
        senderId: tutor.id,
        body: "Olá! Vi o anúncio do Thor. Ele se dá bem com crianças?",
        minutesAgo: 180,
      },
      {
        senderId: shelterAdmin.id,
        body: "Oi João! Se dá muito bem, sim. Ele convive com as crianças dos voluntários.",
        minutesAgo: 150,
      },
      {
        senderId: shelterAdmin.id,
        body: "Quer agendar uma visita para conhecê-lo neste sábado?",
        minutesAgo: 20,
      },
    ];

    for (const message of thread) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: message.senderId,
          body: message.body,
          createdAt: new Date(Date.now() - message.minutesAgo * 60_000),
        },
      });
    }

    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(Date.now() - 20 * 60_000) },
    });
  }

  // --- Points ---------------------------------------------------------------
  //
  // Written as ledger entries with the profile total derived from them, which
  // is the invariant the gamification use case relies on. Seeding the total
  // directly would produce a profile no sequence of real actions could reach.

  const ledger = [
    { points: 20, reason: "Avaliou um prestador! ⭐", source: "seed:review" },
    { points: 10, reason: "Favoritou um pet! 💚", source: `favorite_listing:${favoriteListingId}` },
    { points: 100, reason: "Enviou um pedido de adoção! 🐕", source: "seed:adoption" },
  ];

  for (const entry of ledger) {
    const existing = await db.pointsLedgerEntry.findFirst({
      where: { userId: tutor.id, source: entry.source },
      select: { id: true },
    });

    if (!existing) {
      await db.pointsLedgerEntry.create({ data: { userId: tutor.id, ...entry } });
    }
  }

  const totalPoints = await db.pointsLedgerEntry.aggregate({
    where: { userId: tutor.id },
    _sum: { points: true },
  });

  const points = totalPoints._sum.points ?? 0;

  // Mirrors levelForPoints() in @animalesko/api. Duplicated rather than
  // imported because packages/db must not depend on packages/api — the
  // dependency runs the other way.
  const level = [0, 100, 300, 600, 1000].filter((minimum) => points >= minimum).length;

  await db.gamificationProfile.update({
    where: { userId: tutor.id },
    data: { points, level },
  });

  const reviewerBadge = await db.badge.findUnique({
    where: { code: "reviewer" },
    select: { id: true },
  });

  if (reviewerBadge) {
    await db.userBadge.createMany({
      data: [{ userId: tutor.id, badgeId: reviewerBadge.id }],
      skipDuplicates: true,
    });
  }

  // --- Provider side (apps/plus) --------------------------------------------
  //
  // Everything above is demand-side. Without the rows below, half of `plus`
  // renders empty states: every seeded appointment so far came from a consumer
  // booking, so the walk-in path — the one the prototype's AppointmentForm was
  // entirely about — had nothing to show.

  const walkIns = [
    {
      name: "Ana Souza",
      phone: "(11) 98888-1234",
      email: "ana.souza@email.com",
      notes: "Prefere horários pela manhã.",
      appointment: { serviceLabel: "Banho e Tosa", daysFromNow: 1, minutes: 90 },
    },
    {
      name: "Carlos Lima",
      phone: "(11) 97777-5678",
      email: null,
      notes: null,
      appointment: { serviceLabel: "Consulta Veterinária", daysFromNow: 3, minutes: 30 },
    },
    {
      name: "Fernanda Dias",
      phone: "(11) 96666-9012",
      email: null,
      notes: "Cadela idosa, chega sempre acompanhada.",
      appointment: { serviceLabel: "Consulta de Retorno", daysFromNow: -4, minutes: 30 },
    },
  ];

  for (const entry of walkIns) {
    const contact = await db.clientContact.upsert({
      where: { orgId_phone: { orgId: petCare.id, phone: entry.phone } },
      update: { name: entry.name },
      create: {
        orgId: petCare.id,
        name: entry.name,
        phone: entry.phone,
        email: entry.email,
        notes: entry.notes,
      },
      select: { id: true },
    });

    const scheduledAt = new Date(Date.now() + entry.appointment.daysFromNow * 86_400_000);

    const existing = await db.appointment.findFirst({
      where: { clientContactId: contact.id, serviceLabel: entry.appointment.serviceLabel },
      select: { id: true },
    });

    if (!existing) {
      await db.appointment.create({
        data: {
          orgId: petCare.id,
          clientContactId: contact.id,
          serviceLabel: entry.appointment.serviceLabel,
          scheduledAt,
          durationMinutes: entry.appointment.minutes,
          // Past walk-ins are done; future ones are on the books.
          status: entry.appointment.daysFromNow < 0 ? "COMPLETED" : "CONFIRMED",
        },
      });
    }
  }

  // --- Clinical records for the shelter's animals ---------------------------
  const shelterAnimals = await db.pet.findMany({
    where: { custodianOrgId: shelter.id },
    select: { id: true, name: true },
  });

  for (const animal of shelterAnimals) {
    const hasRecord = await db.healthRecord.findFirst({
      where: { petId: animal.id },
      select: { id: true },
    });

    if (!hasRecord) {
      await db.healthRecord.create({
        data: {
          petId: animal.id,
          orgId: shelter.id,
          authorId: shelterAdmin.id,
          recordedAt: new Date(Date.now() - 20 * 86_400_000),
          weightKg: animal.name === "Bidu" ? "14.20" : "6.80",
          temperatureC: "38.60",
          notes: "Check-up de entrada. Sem alterações dignas de nota.",
        },
      });
    }

    // One overdue booster and one still current, so the dashboard's "vacinas
    // vencendo" panel has both cases to render.
    const overdue = animal.name === "Bidu";

    const hasVaccine = await db.vaccination.findFirst({
      where: { petId: animal.id, name: "V10" },
      select: { id: true },
    });

    if (!hasVaccine) {
      await db.vaccination.create({
        data: {
          petId: animal.id,
          orgId: shelter.id,
          name: "V10",
          appliedAt: new Date(Date.now() - (overdue ? 400 : 60) * 86_400_000),
          nextDoseAt: new Date(Date.now() + (overdue ? -35 : 12) * 86_400_000),
          veterinarian: "Dra. Helena Prado",
        },
      });
    }
  }

  // --- Reminders ------------------------------------------------------------
  const reminders = [
    {
      userId: shelterAdmin.id,
      type: "MEDICATION" as const,
      title: "Vermífugo do Bidu",
      description: "Segunda dose, meio comprimido.",
      daysFromNow: 2,
    },
    {
      userId: sitter.id,
      type: "APPOINTMENT" as const,
      title: "Confirmar retorno da Fernanda",
      description: null,
      daysFromNow: 1,
    },
  ];

  for (const reminder of reminders) {
    const existing = await db.reminder.findFirst({
      where: { userId: reminder.userId, title: reminder.title },
      select: { id: true },
    });

    if (!existing) {
      const { daysFromNow, ...data } = reminder;
      await db.reminder.create({
        data: { ...data, dueAt: new Date(Date.now() + daysFromNow * 86_400_000) },
      });
    }
  }

  // --- An adoption application ----------------------------------------------
  const thorListing = listingIdByPetName.get("Thor");

  if (thorListing) {
    await db.adoptionApplication.upsert({
      where: { listingId_applicantId: { listingId: thorListing, applicantId: tutor.id } },
      update: {},
      create: {
        listingId: thorListing,
        applicantId: tutor.id,
        status: "SUBMITTED",
        message:
          "Moro em casa com quintal cercado e já tive dois cães de porte médio. Posso buscar no fim de semana.",
      },
    });
  }

  // --- Verification ---------------------------------------------------------
  // Pet Care Silva is APPROVED (its org row already says so); the shelter is
  // left mid-review, so the screen has more than one state to show.
  await db.providerVerification.upsert({
    where: { orgId: shelter.id },
    update: {},
    create: {
      orgId: shelter.id,
      status: "PENDING",
      documentUrl: "https://placehold.co/600x400/png?text=RG",
      addressProofUrl: "https://placehold.co/600x400/png?text=Comprovante",
      experienceYears: 8,
      experienceDescription: "ONG atuante desde 2018, com mais de 400 adoções realizadas.",
    },
  });

  await db.organization.update({
    where: { id: shelter.id },
    data: { verificationStatus: "PENDING" },
  });

  const counts = {
    users: await db.user.count(),
    organizations: await db.organization.count(),
    pets: await db.pet.count(),
    offerings: await db.serviceOffering.count(),
    listings: await db.adoptionListing.count(),
    bookings: await db.booking.count(),
    notifications: await db.notification.count(),
    alerts: await db.lostPetAlert.count(),
    messages: await db.message.count(),
    appointments: await db.appointment.count(),
    clients: await db.clientContact.count(),
    vaccinations: await db.vaccination.count(),
    applications: await db.adoptionApplication.count(),
  };

  console.info("Seed complete:", counts);
  console.info(`Demo sign-in: joao.silva@email.com / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
