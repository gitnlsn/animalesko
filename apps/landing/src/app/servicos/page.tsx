import { Breadcrumbs } from "~/components/breadcrumbs";
import { JsonLd } from "~/components/json-ld";
import { ServiceCard } from "~/components/service-card";
import { Container, CtaLink, Heading, Section } from "~/components/ui";
import { services } from "~/lib/content";
import { pageMetadata } from "~/lib/metadata";
import { APP_URL } from "~/lib/site";
import { breadcrumbSchema, serviceListSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

const trail = [
  { name: "Início", path: "/" },
  { name: "Serviços", path: "/servicos" },
];

export const metadata: Metadata = pageMetadata({
  title: "Serviços para pets: banho e tosa, creche, hospedagem e mais",
  description:
    "Conheça os serviços da rede Animalesko: banho e tosa, adoção, pet walker, pet sitter, creche e hospedagem, com profissionais avaliados por outros tutores.",
  path: "/servicos",
  keywords: [
    "serviços para pets",
    "banho e tosa",
    "creche para cães",
    "hospedagem pet",
    "pet sitter",
    "dog walker",
  ],
});

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), serviceListSchema()]} />

      <Section className="from-brand-wash bg-gradient-to-b to-white pb-10">
        <Container>
          <Breadcrumbs trail={trail} />
          <Heading as="h1" eyebrow="Serviços" className="mt-6 max-w-3xl">
            Tudo o que seu pet precisa, com quem entende do assunto
          </Heading>
          <p className="text-ink-soft mt-5 max-w-2xl text-lg leading-relaxed">
            A rede Animalesko reúne profissionais e estabelecimentos avaliados por outros tutores.
            Escolha o serviço, compare quem atende a sua região e agende pelo app — sem telefonema,
            sem incerteza.
          </p>
        </Container>
      </Section>

      <Section className="bg-white pt-4">
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} headingLevel="h2" cta="Ver" />
              </li>
            ))}
          </ul>

          <div className="border-brand-soft bg-brand-wash rounded-card mt-12 flex flex-col items-start gap-5 border p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-ink font-display text-2xl font-semibold">Pronto para agendar?</h2>
              <p className="text-ink-soft mt-2 max-w-xl">
                Busque profissionais que atendem o seu endereço e marque o atendimento pelo app.
              </p>
            </div>
            <CtaLink href={APP_URL} external variant="primary" className="shrink-0">
              Acessar o app
            </CtaLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
