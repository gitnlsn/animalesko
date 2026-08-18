/**
 * Everything the landing needs to know about where Animalesko lives.
 *
 * The three properties are separate deployments on separate subdomains, so the
 * landing can only ever link to them by absolute URL. Keeping those URLs in one
 * module means a domain move is one edit, and — more importantly — means the
 * canonical tags, the sitemap, the JSON-LD and the visible CTAs can never
 * disagree about what the site is called.
 */

/** Strip a trailing slash so `${SITE_URL}${path}` never doubles it. */
function normalise(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * The public origin of this site.
 *
 * On Vercel `VERCEL_PROJECT_PRODUCTION_URL` is the production domain even when
 * the current build is a preview, which is what canonical tags want: a preview
 * must point its canonical at production rather than at its own throwaway URL.
 */
export const SITE_URL = normalise(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://animalesko.org"),
);

/** The consumer app — pet owners, adopters, anyone hiring a service. */
export const APP_URL = normalise(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.animalesko.org");

/**
 * The provider back office.
 *
 * The subdomain is not pointed at the deployment yet, so the variable is
 * deliberately unset: `backoffice.href` is then `null` and every entry point
 * renders as "em breve" with the address shown as plain text instead of as a
 * dead link. Setting NEXT_PUBLIC_BACKOFFICE_URL once DNS resolves turns all of
 * them into real links with no code change.
 */
const backofficeUrl = process.env.NEXT_PUBLIC_BACKOFFICE_URL?.trim();

export const backoffice = {
  /** Always shown to the reader, link or not. */
  hostname: "backoffice.animalesko.org",
  href: backofficeUrl ? normalise(backofficeUrl) : null,
  get isLive(): boolean {
    return this.href !== null;
  },
};

/**
 * Preview deployments must not compete with production in the index.
 *
 * VERCEL_ENV is "production" only for the production deployment; branch and PR
 * builds get "preview". Anything that is not production is served `noindex`.
 */
export const isIndexable =
  process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_FORCE_INDEXABLE === "true";

/**
 * Build an absolute URL for a route.
 *
 * The home page is returned without its trailing slash, because that is the
 * form Next renders into `<link rel="canonical">` after resolving against
 * `metadataBase`. Returning "https://animalesko.org/" here instead would put a
 * URL in the sitemap that does not match the canonical tag on the page it
 * points at — the same document, described two ways, which is exactly what
 * every SEO audit flags.
 */
export function absoluteUrl(path = "/"): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return normalised === "/" ? SITE_URL : `${SITE_URL}${normalised}`;
}

export const site = {
  name: "Animalesko",
  legalName: "Animalesko",
  locale: "pt_BR",
  language: "pt-BR",
  tagline: "Todo animal merece um humano de estimação",
  description:
    "Nossa missão é reduzir o abandono de animais, conectando você ao pet ideal e apoiando quem luta por essa causa. Adote, contrate serviços pet de confiança e apoie ONGs — tudo em um só lugar.",
  /** Used by the Organization JSON-LD and the contact section. */
  email: "contato@animalesko.org",
  country: "BR",
  foundingYear: 2024,
  social: [] as string[],
} as const;

/** Where the header and footer point. Order is the order they render in. */
export const primaryNav = [
  { href: "/servicos", label: "Serviços" },
  { href: "/para-tutores", label: "Para tutores" },
  { href: "/para-prestadores", label: "Para prestadores" },
  { href: "/ongs", label: "ONGs" },
  { href: "/#contato", label: "Contato" },
] as const;
