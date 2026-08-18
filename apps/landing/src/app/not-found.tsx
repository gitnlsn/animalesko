import Link from "next/link";

import { PawMark } from "~/components/paw-mark";
import { Container, CtaLink, Section } from "~/components/ui";
import { services } from "~/lib/content";

import type { Metadata } from "next";

/**
 * 404.
 *
 * `noindex` is the point: a soft 404 that returns 200 and gets indexed is one
 * of the few genuinely damaging SEO mistakes, and Next already returns the
 * right status here — this just makes sure the page itself never enters the
 * index if it is reached some other way.
 */
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Section className="bg-white">
      <Container className="max-w-2xl text-center">
        <PawMark className="mx-auto w-16" title="Animalesko" />
        <h1 className="text-ink font-display mt-8 text-3xl font-semibold sm:text-4xl">
          Essa página fugiu de casa
        </h1>
        <p className="text-ink-soft mt-4 text-lg">
          O endereço que você abriu não existe mais — ou nunca existiu. Que tal voltar ao início ou
          dar uma olhada nos serviços?
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaLink href="/" variant="primary">
            Voltar ao início
          </CtaLink>
          <CtaLink href="/servicos" variant="outline">
            Ver os serviços
          </CtaLink>
        </div>

        <ul className="text-ink-soft mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {services.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/servicos/${service.slug}`}
                className="hover:text-brand underline-offset-4 hover:underline"
              >
                {service.name}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
