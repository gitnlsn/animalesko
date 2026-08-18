import { Fredoka, Poppins } from "next/font/google";

import { JsonLd } from "~/components/json-ld";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { isIndexable, site, SITE_URL } from "~/lib/site";
import { organizationSchema, websiteSchema } from "~/lib/structured-data";

import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

/*
 * Fonts are downloaded at build time and served from our own origin, so there
 * is no request to fonts.googleapis.com at runtime: one less connection to open
 * before the first paint, and no third party watching the visitor.
 *
 * Only the `latin` subset is loaded. Portuguese needs ã, ç, é and õ, all of
 * which live in `latin`; adding `latin-ext` would ship Eastern European glyphs
 * nobody on this site will render.
 */
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fredoka",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  /*
   * Every relative URL in metadata — OG images, canonicals — resolves against
   * this. Without it, a relative image URL is a build error rather than a
   * silently broken share card, which is the behaviour we want.
   */
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Animalesko — Adoção, serviços pet e gestão para prestadores",
    template: "%s · Animalesko",
  },
  description: site.description,
  applicationName: site.name,
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  publisher: site.name,
  category: "pets",
  keywords: [
    "adoção de animais",
    "adotar pet",
    "serviços para pets",
    "banho e tosa",
    "creche para cães",
    "hospedagem pet",
    "pet sitter",
    "dog walker",
    "ONG de animais",
    "gestão para petshop",
  ],

  // Stops iOS Safari from turning numbers in the copy into telephone links,
  // which breaks the typography and creates links nobody asked for.
  formatDetection: { telephone: false, address: false, email: false },

  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },

  // Preview and branch deployments must never compete with production for the
  // same queries. See `isIndexable`.
  robots: isIndexable
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },

  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#2665AB",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.language} className={`${fredoka.variable} ${poppins.variable}`}>
      <body className="min-h-dvh">
        {/*
          The site-wide graph lives in the layout so every route carries the
          same Organization and WebSite nodes, and page-level schemas can point
          at them by @id instead of redeclaring the company on each page.
        */}
        <JsonLd schema={[organizationSchema(), websiteSchema()]} />

        <a
          href="#conteudo"
          className="bg-brand sr-only rounded-full px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:ring-accent"
        >
          Pular para o conteúdo
        </a>

        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
