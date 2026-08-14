import type { Prisma } from "@animalesko/db";

/**
 * The two public projections, defined once.
 *
 * Extracted from the browse use cases because favourites return the same
 * shapes: `/favoritos` renders the identical card as `/adocao`, and it must not
 * drift into showing a different subset of fields.
 */

export const publicListingSelect = {
  id: true,
  summary: true,
  story: true,
  urgency: true,
  city: true,
  state: true,
  publishedAt: true,
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      sex: true,
      size: true,
      birthDate: true,
      photoUrl: true,
      temperament: true,
      neutered: true,
    },
  },
  org: { select: { id: true, slug: true, name: true } },
  photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.AdoptionListingSelect;

export type PublicListingDTO = Prisma.AdoptionListingGetPayload<{
  select: typeof publicListingSelect;
}>;

/**
 * Narrower than the provider-facing projection: consumers get the
 * organization's public identity and rating, and nothing else about it.
 */
export const publicOfferingSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  priceCents: true,
  currency: true,
  priceUnit: true,
  durationMinutes: true,
  tags: true,
  imageUrl: true,
  org: {
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      state: true,
      ratingAvg: true,
      ratingCount: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.ServiceOfferingSelect;

export type PublicOfferingDTO = Prisma.ServiceOfferingGetPayload<{
  select: typeof publicOfferingSelect;
}>;

/**
 * The full listing page: everything the card shows, plus the story, every
 * photo, and enough of the organization to render its contact block.
 */
export const listingDetailSelect = {
  id: true,
  summary: true,
  story: true,
  urgency: true,
  status: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  publishedAt: true,
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      sex: true,
      size: true,
      birthDate: true,
      weightKg: true,
      photoUrl: true,
      temperament: true,
      neutered: true,
      healthStatus: true,
      notes: true,
    },
  },
  org: {
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      city: true,
      state: true,
      phone: true,
      email: true,
      avatarUrl: true,
      ratingAvg: true,
      ratingCount: true,
      verificationStatus: true,
    },
  },
  photos: { select: { url: true }, orderBy: { position: "asc" } },
} satisfies Prisma.AdoptionListingSelect;

type ListingDetailRow = Prisma.AdoptionListingGetPayload<{ select: typeof listingDetailSelect }>;

/**
 * `weightKg` narrowed to a number for the same reason as `PetDTO`: Prisma's
 * `Decimal` survives neither superjson nor the Server Component boundary.
 */
export type ListingDetailDTO = Omit<ListingDetailRow, "pet"> & {
  pet: Omit<ListingDetailRow["pet"], "weightKg"> & { weightKg: number | null };
};

export function toListingDetailDTO(row: ListingDetailRow): ListingDetailDTO {
  return {
    ...row,
    pet: {
      ...row.pet,
      weightKg: row.pet.weightKg === null ? null : row.pet.weightKg.toNumber(),
    },
  };
}
