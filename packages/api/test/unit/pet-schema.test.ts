import { describe, expect, it } from "vitest";

import { formatPrice } from "../../src/schemas/money.ts";
import { ageInMonths, createPetSchema, formatAgePtBR } from "../../src/schemas/pet.ts";

describe("pet schema", () => {
  it("trims and requires a name", () => {
    expect(createPetSchema.safeParse({ name: "  ", species: "DOG" }).success).toBe(false);

    const parsed = createPetSchema.parse({ name: "  Rex  ", species: "DOG" });
    expect(parsed.name).toBe("Rex");
    // Defaults come from the schema, so every caller agrees on them.
    expect(parsed).toMatchObject({ sex: "UNKNOWN", healthStatus: "GOOD", neutered: false });
  });

  it("rejects impossible weights and future birth dates", () => {
    expect(createPetSchema.safeParse({ name: "A", species: "DOG", weightKg: 0 }).success).toBe(
      false,
    );
    expect(createPetSchema.safeParse({ name: "A", species: "DOG", weightKg: 500 }).success).toBe(
      false,
    );
    expect(
      createPetSchema.safeParse({
        name: "A",
        species: "DOG",
        birthDate: new Date(Date.now() + 86_400_000),
      }).success,
    ).toBe(false);
  });

  it("requires a 15-digit microchip when provided", () => {
    expect(
      createPetSchema.safeParse({ name: "A", species: "DOG", microchip: "12345" }).success,
    ).toBe(false);
    expect(
      createPetSchema.safeParse({ name: "A", species: "DOG", microchip: "123456789012345" })
        .success,
    ).toBe(true);
  });
});

describe("derived age", () => {
  const now = new Date("2026-08-14T00:00:00Z");

  it("counts whole months", () => {
    expect(ageInMonths(new Date("2026-08-14"), now)).toBe(0);
    expect(ageInMonths(new Date("2026-06-14"), now)).toBe(2);
    expect(ageInMonths(new Date("2021-03-15"), now)).toBe(64);
    expect(ageInMonths(null, now)).toBeNull();
  });

  it("formats the way the prototypes hardcoded it", () => {
    expect(formatAgePtBR(new Date("2024-08-14"), now)).toBe("2 anos");
    expect(formatAgePtBR(new Date("2025-08-14"), now)).toBe("1 ano");
    expect(formatAgePtBR(new Date("2026-04-14"), now)).toBe("4 meses");
    expect(formatAgePtBR(new Date("2026-07-14"), now)).toBe("1 mês");
    expect(formatAgePtBR(null, now)).toBe("Idade desconhecida");
  });
});

describe("money", () => {
  // Intl inserts a non-breaking space after "R$"; normalise it so the
  // assertion reads as the string a user actually sees.
  const normalise = (value: string) => value.replace(/\u00A0/g, " ");

  it("renders the prototype's price strings from integer cents", () => {
    // "R$ 45/dia" and "R$ 25/passeio" were stored as display strings before.
    expect(normalise(formatPrice(4500, "PER_DAY"))).toBe("R$ 45,00/dia");
    expect(normalise(formatPrice(2500, "PER_WALK"))).toBe("R$ 25,00/passeio");
  });
});
