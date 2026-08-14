/**
 * Deterministic primary keys for demo rows.
 *
 * Every model's id is a plain `String` — `@default(cuid())` only supplies one
 * when the write does not. Supplying them here is worth three things:
 *
 *   * relations can be wired without reading rows back, so the whole seed is a
 *     handful of `createMany` calls in dependency order rather than thousands
 *     of round-trips against a database that may be a continent away;
 *   * `createMany({ skipDuplicates: true })` makes a re-run a no-op;
 *   * anything still carrying the prefix after a cleanup ran is, visibly,
 *     something the cleanup missed.
 *
 * The shape is not free. Roughly fifty procedures in `packages/api` validate
 * their id argument with `z.cuid()` — `/^[cC][0-9a-z]{6,}$/` — so an id that is
 * merely unique is not enough: an obviously-synthetic `dmo_lst_0001` is
 * rejected by the contract before the query runs, and every detail page,
 * booking dialog and favourite button 500s on data that is perfectly valid in
 * the database. Hence the leading `c` and the lowercase-alphanumeric body.
 *
 * `cdmo` still marks these as seeded at a glance, which is the property the
 * cleanup's verification depends on.
 */

const PREFIX = "cdmo";

export type IdKind =
  | "usr"
  | "acc"
  | "sub"
  | "gam"
  | "org"
  | "mem"
  | "ver"
  | "off"
  | "cli"
  | "pet"
  | "hlt"
  | "vac"
  | "rem"
  | "lst"
  | "pho"
  | "app"
  | "bkg"
  | "pay"
  | "rev"
  | "apt"
  | "alr"
  | "aph"
  | "sig"
  | "cnv"
  | "prt"
  | "msg"
  | "ntf"
  | "fvl"
  | "fvo"
  | "pts"
  | "ubg";

/** `id("pet", 42)` → `"cdmopet000042"`. */
export function id(kind: IdKind, index: number): string {
  return `${PREFIX}${kind}${String(index).padStart(6, "0")}`;
}

export function isDemoId(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Hands out ids of one kind in order.
 *
 * The generators produce rows in nested loops whose counts depend on random
 * draws, so a running counter is the only practical way to keep ids dense and
 * unique without threading an index through every call.
 */
export function counter(kind: IdKind, start = 1): () => string {
  let next = start;
  return () => id(kind, next++);
}
