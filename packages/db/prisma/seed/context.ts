import type { City } from "./fixtures.ts";
import type { Rng } from "./rng.ts";
import type { PrismaClient } from "../../src/index.ts";

/**
 * What every generator is handed, and what they hand to each other.
 *
 * The generators run in dependency order and each one writes its own tables
 * before returning a slim index of what it created. Keeping the index slim
 * matters: with 220 pets and 900 appointments, passing whole rows around would
 * hold the entire dataset in memory twice for no benefit — downstream
 * generators only ever need ids and the handful of fields they branch on.
 */
export interface SeedContext {
  db: PrismaClient;
  rng: Rng;
  /** Captured once, so "today" means the same instant in every generator. */
  now: Date;
}

export type Species = "DOG" | "CAT" | "BIRD" | "RODENT" | "REPTILE" | "FISH" | "OTHER";
export type OrgType = "SHELTER" | "CLINIC" | "PETSHOP" | "INDEPENDENT";
export type ServiceType =
  | "PET_SITTER"
  | "DOG_WALKER"
  | "DAYCARE"
  | "HOTEL"
  | "GROOMING"
  | "VET_CONSULT"
  | "VACCINATION"
  | "TRAINING"
  | "TRANSPORT"
  | "OTHER";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  isTutor: boolean;
  isProvider: boolean;
  city: City;
  /** The four accounts the README documents, plus the foster tutor. */
  isHero: boolean;
  premium: boolean;
}

export interface DemoOrg {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  city: City;
  ownerId: string;
  memberIds: string[];
}

export interface DemoOffering {
  id: string;
  orgId: string;
  type: ServiceType;
  title: string;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface DemoPet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  ownerId: string | null;
  custodianOrgId: string | null;
  city: City;
  /**
   * Kept alongside `birthDate` rather than re-derived. Age is deliberately not
   * a column — it is computed from `birthDate` at render — but the generators
   * branch on it constantly (adoption urgency, which vaccines are due), and
   * recovering it from the Date they just wrote would be busywork.
   */
  ageMonths: number;
  /** Shelter animals become listings; owned animals become bookable. */
  forAdoption: boolean;
}

export interface DemoListing {
  id: string;
  petId: string;
  orgId: string;
  status: "DRAFT" | "AVAILABLE" | "RESERVED" | "ADOPTED" | "ARCHIVED";
  petName: string;
}

export interface DemoBooking {
  id: string;
  code: string;
  tutorId: string;
  petId: string;
  offeringId: string;
  orgId: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: Date;
  priceCents: number;
  reviewed: boolean;
}

export interface DemoClientContact {
  id: string;
  orgId: string;
  name: string;
}

export interface World {
  users: DemoUser[];
  tutors: DemoUser[];
  providers: DemoUser[];
  /** `joao.silva@email.com` — the account a reviewer signs into `app` with. */
  heroTutor: DemoUser;
  /** PREMIUM, 55 animals, so `/meus-pets` cursor pagination has something to page. */
  fosterTutor: DemoUser;
  orgs: DemoOrg[];
  shelters: DemoOrg[];
  clinics: DemoOrg[];
  offerings: DemoOffering[];
  clientContacts: DemoClientContact[];
  pets: DemoPet[];
  ownedPets: DemoPet[];
  custodyPets: DemoPet[];
  listings: DemoListing[];
  bookings: DemoBooking[];
}

/** Chunked `createMany`, so a 900-row insert does not become one huge statement. */
export async function insertMany<T>(
  rows: T[],
  write: (batch: T[]) => Promise<unknown>,
  size = 250,
): Promise<number> {
  for (let index = 0; index < rows.length; index += size) {
    await write(rows.slice(index, index + size));
  }
  return rows.length;
}

/** "José da Conceição" → "jose.da.conceicao" — safe for an email local part. */
export function slugifyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/** `(11) 98765-4321` — the shape `packages/api`'s Zod contracts validate. */
export function phoneFor(rng: Rng, city: City): string {
  return `(${city.ddd}) 9${rng.int(1000, 9999)}-${rng.int(1000, 9999)}`;
}
