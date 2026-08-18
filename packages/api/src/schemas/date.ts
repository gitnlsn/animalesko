import { z } from "zod";

/**
 * A date that must not be in the future.
 *
 * Written as a `refine` rather than `z.date().max(new Date())` because the
 * latter evaluates `new Date()` **once, when the module is imported**, and
 * freezes that instant as the ceiling for the life of the process. On a
 * long-running server the bound therefore drifts further into the past the
 * longer it stays up, and "now" eventually fails its own validation — which is
 * exactly what happened to `sightedAt`: a sighting reported seconds after boot
 * passed, one reported later did not.
 *
 * `refine` runs per parse, so the bound is always the actual current time.
 */
export function pastDate(message: string) {
  return z.date().refine((value) => value.getTime() <= Date.now(), { message });
}

/**
 * Animalesko schedules in Brazilian wall-clock time.
 *
 * Appointments belong to a place, not to whoever is holding the phone: a hotel
 * booked for "22 de agosto às 12:00" is midday at the hotel whether the tutor
 * booked it from São Paulo or from a laptop set to UTC. Both write paths used
 * `setHours`, which resolves against the *device* timezone, so the instant
 * actually stored depended on who did the booking — and the same row then read
 * back as a different hour on a differently-configured device.
 */
export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/** How far `BRAZIL_TIME_ZONE` is from UTC at a given instant, in minutes. */
function zoneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? "0");
  // `hour12: false` renders midnight as 24 in some runtimes.
  const asIfUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") % 24,
    part("minute"),
    part("second"),
  );

  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * The instant at which the given calendar day reads `hours:minutes` in Brazil.
 *
 * The offset has to be measured at the answer rather than at the guess, because
 * the two can straddle a transition; measuring twice settles it. Brazil has had
 * no daylight saving since 2019, so the second pass is almost always a no-op —
 * it is there so that reinstating it, or reusing this for another zone, does
 * not silently shift every booking by an hour.
 */
export function brazilWallClock(day: Date, hours: number, minutes: number): Date {
  const wallClock = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
  const firstPass = wallClock - zoneOffsetMinutes(new Date(wallClock)) * 60_000;
  const secondPass = wallClock - zoneOffsetMinutes(new Date(firstPass)) * 60_000;
  return new Date(secondPass);
}
