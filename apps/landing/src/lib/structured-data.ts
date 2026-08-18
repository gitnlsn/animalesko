import { services, type Service } from "~/lib/content";
import { absoluteUrl, APP_URL, backoffice, site, SITE_URL } from "~/lib/site";

/**
 * JSON-LD builders.
 *
 * Google reads schema.org markup to decide whether a result is eligible for
 * anything richer than a blue link — the FAQ dropdowns, the breadcrumb trail
 * above the URL, the knowledge panel for the brand. None of it is guaranteed,
 * but none of it is possible without the markup.
 *
 * Every node carries a stable `@id` built from a real URL, so the graph is one
 * connected entity across the whole site rather than a fresh, anonymous
 * organisation repeated on each page.
 */

const ORGANISATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANISATION_ID,
    name: site.name,
    legalName: site.legalName,
    url: SITE_URL,
    description: site.description,
    slogan: site.tagline,
    foundingDate: String(site.foundingYear),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon-512.png"),
      width: 512,
      height: 512,
    },
    image: absoluteUrl("/opengraph-image"),
    email: site.email,
    areaServed: {
      "@type": "Country",
      name: "Brasil",
    },
    knowsLanguage: site.language,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: site.email,
        availableLanguage: ["Portuguese"],
        areaServed: site.country,
      },
    ],
    // The two product surfaces are part of the same entity as the marketing
    // site, which is what tells a crawler that app.animalesko.org is not some
    // unrelated third party.
    subOrganization: undefined,
    sameAs: [APP_URL, ...(backoffice.href ? [backoffice.href] : []), ...site.social],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: site.name,
    description: site.description,
    inLanguage: site.language,
    publisher: { "@id": ORGANISATION_ID },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqSchema(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function serviceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": absoluteUrl(`/servicos/${service.slug}#service`),
    name: service.heading,
    alternateName: service.name,
    serviceType: service.name,
    description: service.metaDescription,
    url: absoluteUrl(`/servicos/${service.slug}`),
    image: absoluteUrl(service.image.src),
    inLanguage: site.language,
    provider: { "@id": ORGANISATION_ID },
    areaServed: { "@type": "Country", name: "Brasil" },
    audience: {
      "@type": "Audience",
      audienceType: "Tutores de cães e gatos",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `O que inclui: ${service.name}`,
      itemListElement: service.includes.map((item) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: item },
      })),
    },
  };
}

/** The `/servicos` index: one list naming every service page. */
export function serviceListSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Serviços para pets na Animalesko",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: services.length,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: service.name,
      url: absoluteUrl(`/servicos/${service.slug}`),
    })),
  };
}

/**
 * The consumer app, described as software rather than as a page.
 *
 * It is a web app that also runs as an installable build, so `WebApplication`
 * with both operating systems listed is the honest description.
 */
export function appSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Animalesko",
    url: APP_URL,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, Android, iOS",
    inLanguage: site.language,
    publisher: { "@id": ORGANISATION_ID },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
  };
}
