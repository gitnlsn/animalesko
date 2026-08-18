import { BRAZIL_TIME_ZONE, brazilWallClock } from "../../src/schemas/date.ts";
import { describe, expect, it } from "vitest";

/**
 * The bug these cover: both booking write paths built their instant with
 * `setHours`, which resolves against the *device* timezone. The same slot
 * therefore stored a different moment depending on who booked it, and read back
 * as a different hour on a differently-configured device — a hotel booked for
 * midday showed 09:00 to a tutor in São Paulo and 12:00 on a UTC emulator.
 *
 * Asserting on the Brazilian rendering rather than on a UTC offset is
 * deliberate: the offset is an implementation detail that would change if the
 * country reinstated daylight saving, while "the booking reads 12:00 in Brazil"
 * is the actual promise being made to both the tutor and the provider.
 */
function brazilianClock(instant: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

describe("brazilWallClock", () => {
  it("puts the requested time on the Brazilian clock", () => {
    const day = new Date(2026, 7, 22); // 22 August 2026, as the picker yields it
    expect(brazilianClock(brazilWallClock(day, 12, 0))).toBe("22/08, 12:00");
  });

  it("stores the same instant no matter where the booking was made", () => {
    // Two devices, same calendar day, same chosen time. The Date the picker
    // hands over carries the device's midnight, which is what used to leak in.
    const fromBrazil = new Date(2026, 7, 22, 0, 0);
    const fromElsewhere = new Date(2026, 7, 22, 23, 30);

    expect(brazilWallClock(fromBrazil, 9, 30).toISOString()).toBe(
      brazilWallClock(fromElsewhere, 9, 30).toISOString(),
    );
  });

  it("keeps midnight on the day it was chosen", () => {
    // The case a naive UTC construction gets wrong: 00:00 in Brazil is 03:00
    // UTC, so treating the wall clock as UTC would roll the date back a day.
    const day = new Date(2026, 7, 22);
    expect(brazilianClock(brazilWallClock(day, 0, 0))).toBe("22/08, 00:00");
  });

  it("survives a day either side of the old DST boundary", () => {
    // Brazil dropped daylight saving in 2019; February used to be inside it.
    // Both must land on their own clock regardless of what the runtime's tz
    // database believes about historical transitions.
    expect(brazilianClock(brazilWallClock(new Date(2026, 1, 14), 10, 0))).toBe("14/02, 10:00");
    expect(brazilianClock(brazilWallClock(new Date(2026, 1, 16), 10, 0))).toBe("16/02, 10:00");
  });
});
