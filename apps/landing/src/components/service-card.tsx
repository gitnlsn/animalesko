import Image from "next/image";
import Link from "next/link";

import type { Service } from "~/lib/content";

/**
 * A service teaser, used by the home page and by /servicos.
 *
 * The whole card is the link, not the "Saiba mais" line at the bottom of it.
 * That line was a 20px-tall target on a phone — technically inside WCAG 2.5.8
 * thanks to the spacing exception, but a thumb-sized miss in practice, and the
 * image and title above it looked tappable while doing nothing. Tapping
 * anywhere on the card is what people expect from a card anyway.
 *
 * `aria-labelledby` points the link at the heading so a screen reader announces
 * "Banho e Tosa" rather than reading the image alt text, the summary and the
 * call to action as one run-on link name. The summary stays readable as
 * ordinary content.
 */
export function ServiceCard({
  service,
  headingLevel = "h3",
  cta = "Saiba mais sobre",
}: {
  service: Service;
  /**
   * The card sits under a section heading on the home page, but is the primary
   * content of /servicos. Heading level is document structure, so the caller
   * decides it.
   */
  headingLevel?: "h2" | "h3";
  cta?: string;
}) {
  const Heading = headingLevel;
  const headingId = `servico-${service.slug}`;

  return (
    <Link
      href={`/servicos/${service.slug}`}
      aria-labelledby={headingId}
      className="group border-line rounded-card hover:border-brand flex h-full flex-col overflow-hidden border bg-white transition-all hover:shadow-brand-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={service.image}
          alt={service.imageAlt}
          placeholder="blur"
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading id={headingId} className="text-ink font-display text-xl font-semibold">
          {service.name}
        </Heading>
        <p className="text-ink-soft mt-2 flex-1 leading-relaxed">{service.summary}</p>
        <span className="text-brand group-hover:text-brand-dark mt-5 text-sm font-medium">
          {cta} {service.name.toLowerCase()} →
        </span>
      </div>
    </Link>
  );
}
