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
