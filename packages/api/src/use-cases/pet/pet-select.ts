import type { Prisma } from "@animalesko/db";

/**
 * The projection every pet use case returns.
 *
 * Explicit rather than `select: undefined`, so adding a column to the Pet model
 * never silently starts shipping it to clients. Defined once here because the
 * shape is part of the contract: six use cases and both apps depend on it.
 */
export const petSelect = {
  id: true,
  name: true,
  species: true,
  breed: true,
  sex: true,
  size: true,
  birthDate: true,
  weightKg: true,
  healthStatus: true,
  photoUrl: true,
  notes: true,
  temperament: true,
  neutered: true,
  microchip: true,
  deceasedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PetSelect;

/** The row exactly as Prisma returns it, `Decimal` columns included. */
type PetRow = Prisma.PetGetPayload<{ select: typeof petSelect }>;

/**
 * Derived from the projection, so the two can never drift apart — except for
 * `weightKg`, which is narrowed to a plain number.
 *
 * Prisma hands back a `Decimal` instance for a `@db.Decimal` column, and that
 * class survives neither superjson nor the React Server Component boundary: a
 * pet with a weight prefetched in a Server Component crashed with "Only plain
 * objects can be passed to Client Components. Decimal objects are not
 * supported." `Decimal(5, 2)` is representable exactly as a double and the
 * contract already declares the field as `z.number()`, so the conversion
 * happens here, once, instead of at every call site.
 */
export type PetDTO = Omit<PetRow, "weightKg"> & { weightKg: number | null };

export function toPetDTO(pet: PetRow): PetDTO {
  return { ...pet, weightKg: pet.weightKg === null ? null : pet.weightKg.toNumber() };
}
