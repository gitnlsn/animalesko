/**
 * A seeded pseudo-random generator, so two seed runs produce identical data.
 *
 * Determinism is not a nicety here. The seed is meant to be run against a
 * shared database that several people then review; "the listing I was looking
 * at yesterday is gone" is a bug report nobody should have to file. It also
 * means a screenshot can be reproduced from the seed alone.
 *
 * mulberry32 rather than anything from npm: 12 lines, no dependency, and
 * statistically far better than the `Math.sin` hacks it usually competes with.
 */
export class Rng {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number, decimals = 2): number {
    const value = min + this.next() * (max - min);
    return Number(value.toFixed(decimals));
  }

  bool(probabilityOfTrue = 0.5): boolean {
    return this.next() < probabilityOfTrue;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick called with an empty list.");
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** `count` distinct members, or the whole list if it is shorter. */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const taken: T[] = [];

    while (taken.length < count && pool.length > 0) {
      taken.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0]!);
    }

    return taken;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  /**
   * One member per its declared weight.
   *
   * Used wherever a distribution matters to the UI rather than to realism —
   * booking statuses, for instance, have to cover all six but must not be
   * uniform, or "Realizados" and "Cancelados" end up the same size.
   */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;

    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }

    return entries[entries.length - 1]![0];
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// --- Time helpers -----------------------------------------------------------
//
// Every date in the seed is relative to a single `now` captured at startup, so
// "hoje na agenda" is genuinely today whenever the seed last ran, and the
// past/future split in the booking history stays correct.

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;

export function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

export function hoursFrom(now: Date, hours: number): Date {
  return new Date(now.getTime() + hours * HOUR_MS);
}

export function minutesFrom(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * MINUTE_MS);
}

/** Local midnight of the day `now` falls on — the boundary the API's own stats use. */
export function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A time on `date`'s calendar day, in local time. */
export function atTime(date: Date, hour: number, minute = 0): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
  return result;
}

/**
 * UTC midnight, for the columns declared `@db.Date`.
 *
 * Postgres stores a bare date there and Prisma sends whatever instant it is
 * given, so a local-midnight Date in a negative-offset timezone (which is every
 * Brazilian one) lands on the previous day. Birth dates and vaccine dates are
 * off by one for the entire dataset if this is skipped.
 */
export function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function dateOnlyFrom(now: Date, days: number): Date {
  return dateOnly(daysFrom(now, days));
}

// --- Geography --------------------------------------------------------------

/**
 * A point scattered up to `km` from the one given.
 *
 * One degree of latitude is ~111 km anywhere; one degree of longitude is that
 * scaled by cos(latitude), which at Brazilian latitudes is a 3–10% correction —
 * small, but the difference between alerts that sit convincingly along the
 * streets of a city and alerts that drift into the sea off Recife.
 */
export function scatter(
  rng: Rng,
  lat: number,
  lng: number,
  km: number,
): { lat: number; lng: number } {
  const latDegrees = km / 111;
  const lngDegrees = km / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    lat: Number((lat + rng.float(-latDegrees, latDegrees, 6)).toFixed(6)),
    lng: Number((lng + rng.float(-lngDegrees, lngDegrees, 6)).toFixed(6)),
  };
}
