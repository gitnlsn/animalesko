import Image from "next/image";
import Link from "next/link";

import heroImage from "~/../public/images/hero-tutores-e-pets.webp";

import { Destinations } from "~/components/destinations";
import { JsonLd } from "~/components/json-ld";
import { LeadForm } from "~/components/lead-form";
import { PawMark } from "~/components/paw-mark";
import { ServiceCard } from "~/components/service-card";
import { Container, CtaLink, FaqList, Heading, Section } from "~/components/ui";
import { audiences, homeFaq, services } from "~/lib/content";
import { pageMetadata } from "~/lib/metadata";
import { APP_URL, backoffice, site } from "~/lib/site";
import { appSchema, faqSchema, serviceListSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Animalesko — Adoção, serviços pet e gestão para prestadores",
  description:
    "Adote um pet, contrate banho e tosa, creche, hospedagem, pet sitter ou passeador com profissionais avaliados. Tutores usam o app; prestadores gerenciam o negócio no back office.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd schema={[faqSchema(homeFaq), serviceListSchema(), appSchema()]} />

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <Section className="from-brand-wash bg-gradient-to-b to-white pt-12 sm:pt-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="mb-3 text-sm font-semibold tracking-[0.14em] text-accent uppercase">
                Animalesko
              </p>
              <h1 className="text-ink font-display text-4xl leading-[1.1] font-semibold sm:text-5xl lg:text-6xl">
                Adote, cuide, ame!
                <span className="text-brand block">A gente te ajuda</span>
              </h1>
              <p className="text-ink-soft mt-6 max-w-xl text-lg leading-relaxed">
                Nossa missão é reduzir o abandono de animais, conectando você ao pet ideal e
                apoiando quem luta por essa causa. Adoção, banho e tosa, creche, hospedagem, pet
                sitter e passeadores — tudo com profissionais avaliados, em um só lugar.
              </p>
              <p className="text-ink font-display mt-4 text-xl">
                Vamos juntos fazer parte dessa mudança?
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <CtaLink href={APP_URL} external variant="primary">
                  Sou tutor — acessar o app
                </CtaLink>
                <CtaLink
                  href={backoffice.isLive ? backoffice.href! : "/para-prestadores"}
                  external={backoffice.isLive}
                  variant="outline"
                >
                  Ofereço serviços pet
                </CtaLink>
              </div>
            </div>

            <div className="relative">
              <Image
                src={heroImage}
                alt="Um homem beijando o focinho de um labrador e uma mulher abraçando o seu cachorro"
                placeholder="blur"
                priority
                sizes="(min-width: 1024px) 42vw, 92vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Where to go — the point of the page                                 */}
      {/* ------------------------------------------------------------------ */}
      <Section id="acessos" className="bg-white">
        <Container>
          <Heading eyebrow="Por onde entrar" className="max-w-2xl">
            Dois endereços, dois jeitos de usar a Animalesko
          </Heading>
          <p className="text-ink-soft mt-4 max-w-2xl text-lg">
            Quem tem pet e quem cuida de pets usam ferramentas diferentes. Escolha o seu lado — e
            guarde o endereço, dá para ir direto na próxima vez.
          </p>

          <div className="mt-10">
            <Destinations />
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Three audiences                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Section className="bg-sky-band/40">
        <Container>
          <Heading eyebrow="Para quem é" className="max-w-2xl">
            A rede que liga tutores, prestadores e ONGs
          </Heading>

          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => (
              <li key={audience.id}>
                <Link
                  href={audience.href}
                  className="group border-line hover:border-brand rounded-card flex h-full flex-col border bg-white p-7 transition-all hover:shadow-brand-sm"
                >
                  <PawMark className="w-7" />
                  <p className="mt-5 text-sm font-semibold tracking-[0.14em] text-accent uppercase">
                    {audience.eyebrow}
                  </p>
                  <h3 className="text-ink group-hover:text-brand font-display mt-2 text-xl font-semibold transition-colors">
                    {audience.title}
                  </h3>
                  <p className="text-ink-soft mt-3 leading-relaxed">{audience.description}</p>
                  <span className="text-brand mt-5 text-sm font-medium">Saiba mais →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Services                                                            */}
      {/* ------------------------------------------------------------------ */}
      <Section id="servicos" className="bg-white">
        <Container>
          <Heading eyebrow="Serviços" className="max-w-3xl">
            Na Animalesko, cuidar do seu pet é nossa paixão!
          </Heading>
          <p className="text-ink-soft mt-4 max-w-2xl text-lg">
            Temos uma turma de serviços pra deixar seu bichinho feliz e você sem preocupações. Dá
            uma olhada:
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Section className="bg-cream">
        <Container>
          <Heading eyebrow="Como funciona" className="max-w-2xl">
            Do primeiro clique ao pet bem cuidado
          </Heading>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Encontre",
                body: "Busque o serviço que precisa ou o pet que quer adotar. Os resultados consideram quem realmente atende o seu endereço.",
              },
              {
                title: "Compare e escolha",
                body: "Veja perfil, serviços e avaliações de outros tutores antes de decidir. Nada de escolher no escuro.",
              },
              {
                title: "Agende e acompanhe",
                body: "Marque o atendimento pelo app e mantenha o histórico do seu pet organizado — vacinas, consultas e serviços.",
              },
            ].map((step, index) => (
              <li key={step.title} className="rounded-card bg-white/70 p-7">
                <span className="bg-brand font-display inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="text-ink font-display mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="text-ink-soft mt-2 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Section id="perguntas" className="bg-white">
        <Container className="max-w-4xl">
          <Heading eyebrow="Perguntas frequentes">Ainda com dúvida?</Heading>
          <div className="mt-8">
            <FaqList entries={homeFaq} />
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Lead capture                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Section id="contato" className="bg-sky-band/40">
        <Container className="max-w-3xl">
          <Heading eyebrow="Fique por dentro" className="text-center">
            Faça parte do universo {site.name}
          </Heading>
          <p className="text-ink-soft mx-auto mt-4 max-w-xl text-center text-lg">
            Preencha os dados abaixo e vamos te manter informado sempre que houver novidades e
            oportunidades.
          </p>

          <div className="mt-10">
            <LeadForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
