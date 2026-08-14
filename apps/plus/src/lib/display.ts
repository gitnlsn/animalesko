import type { PetSize, Sex, Species } from "@animalesko/api/schemas";

/**
 * Enum → Portuguese, in one place.
 *
 * The prototypes carried these as free strings on every mock record
 * ("female", "large", "Cachorro"), so the same concept was spelled three ways
 * across two repos. The database stores enums; this is the only place they
 * become words.
 */

export const SPECIES_LABELS: Record<Species, string> = {
  DOG: "Cão",
  CAT: "Gato",
  BIRD: "Ave",
  RODENT: "Roedor",
  REPTILE: "Réptil",
  FISH: "Peixe",
  OTHER: "Outro",
};

export const SPECIES_EMOJI: Record<Species, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🐦",
  RODENT: "🐹",
  REPTILE: "🦎",
  FISH: "🐠",
  OTHER: "🐾",
};

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Macho",
  FEMALE: "Fêmea",
  UNKNOWN: "Não informado",
};

export const SIZE_LABELS: Record<PetSize, string> = {
  SMALL: "Pequeno",
  MEDIUM: "Médio",
  LARGE: "Grande",
};

/** Fallback art for a pet with no photo. Shipped in `public/images`. */
export const PLACEHOLDER_PET_IMAGE = "/images/hero-pet.jpg";

export function petImage(listing: {
  photos: { url: string }[];
  pet: { photoUrl: string | null };
}): string {
  return listing.photos[0]?.url ?? listing.pet.photoUrl ?? PLACEHOLDER_PET_IMAGE;
}

/** "12 de março", "12 de março às 14:00" — pt-BR, one formatter per shape. */
export function formatDatePtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date);
}

export function formatDateTimePtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDatePtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

/** "março de 2026" — the grouping heading in the service history. */
export function formatMonthPtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

/** "14:30" — the time alone, for an agenda row. */
export function formatTimePtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** "segunda-feira, 12 de março" — the heading over one day's appointments. */
export function formatWeekdayPtBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}
