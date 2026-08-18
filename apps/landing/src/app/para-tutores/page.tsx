import Image from "next/image";
import Link from "next/link";

import adocaoImage from "~/../public/images/adocao-abraco.webp";

import { Breadcrumbs } from "~/components/breadcrumbs";
import { JsonLd } from "~/components/json-ld";
import { PawMark } from "~/components/paw-mark";
import { TutorCard } from "~/components/destinations";
import { Container, CtaLink, FaqList, Heading, Section } from "~/components/ui";
import { services } from "~/lib/content";
import { pageMetadata } from "~/lib/metadata";
import { APP_URL } from "~/lib/site";
import { appSchema, breadcrumbSchema, faqSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

const trail = [
  { name: "Início", path: "/" },
  { name: "Para tutores", path: "/para-tutores" },
];

export const metadata: Metadata = pageMetadata({
  title: "Para tutores: o app da Animalesko",
  description:
    "Adote, contrate serviços pet e guarde o histórico do seu animal em app.animalesko.org. Funciona no navegador do computador e do celular, sem instalar nada.",
  path: "/para-tutores",
  keywords: [
    "app para tutores de pets",
    "agendar banho e tosa",
    "adotar pet",
    "carteirinha do pet",
  ],
});

const faq = [
  {
    question: "Preciso instalar algum aplicativo?",
    answer:
      "Não. O app da Animalesko abre no navegador, em app.animalesko.org, tanto no computador quanto no celular. Se preferir, dá para adicioná-lo à tela inicial do telefone e usar como um aplicativo comum.",
  },
  {
    question: "Quanto custa usar a Animalesko?",
    answer:
      "Criar conta, buscar serviços, ver animais para adoção e falar com ONGs é gratuito. Você paga apenas o serviço que contratar, diretamente ao profissional escolhido.",
  },
  {
    question: "Como sei se o profissional é de confiança?",
    answer:
      "Cada prestador tem um perfil com serviços, avaliações e comentários de outros tutores que já foram atendidos pela plataforma. Você lê tudo antes de agendar.",
  },
  {
    question: "Posso cadastrar mais de um pet?",
    answer:
      "Sim. Você cadastra quantos animais quiser, cada um com o próprio histórico de vacinas, consultas e serviços realizados.",
  },
];

const highlights = [
  {
    title: "Serviços perto de você",
    body: "Busque banho e tosa, creche, hospedagem, pet sitter ou passeador entre profissionais que realmente atendem o seu endereço.",
  },
  {
    title: "Avaliações de verdade",
    body: "As notas vêm de tutores que contrataram pela plataforma, não de comentários soltos na internet.",
  },
  {
    title: "Adoção responsável",
    body: "Conheça animais de ONGs e protetores parceiros, com histórico e temperamento descritos antes do primeiro contato.",
  },
  {
    title: "A vida do seu pet organizada",
    body: "Vacinas, consultas, serviços contratados e documentos, tudo em um lugar só — inclusive quando você troca de veterinário.",
  },
  {
    title: "Pet Alert",
    body: "Sumiu? Publique um alerta e mobilize a rede de tutores e ONGs da sua região.",
  },
  {
    title: "Agendamento sem telefonema",
    body: "Escolha o horário, confirme e acompanhe o atendimento pelo app.",
  },
];

export default function ParaTutoresPage() {
  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), faqSchema(faq), appSchema()]} />

      <Section className="from-brand-wash bg-gradient-to-b to-white pb-10">
        <Container>
          <Breadcrumbs trail={trail} />

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Heading as="h1" eyebrow="Para tutores">
                Seu pet bem cuidado, do agendamento ao histórico
              </Heading>
              <p className="text-ink-soft mt-5 max-w-xl text-lg leading-relaxed">
                O app da Animalesko é onde você encontra serviços pet de confiança, conhece animais
                disponíveis para adoção e mantém a vida do seu companheiro organizada. Abre no
                navegador do computador e do celular — não precisa instalar nada.
              </p>

              <p className="text-ink-soft mt-6 text-sm">
                O endereço é{" "}
                <code className="text-brand bg-brand-wash rounded-md px-2 py-1 font-mono text-[0.8125rem] font-semibold">
                  app.animalesko.org
                </code>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <CtaLink href={APP_URL} external variant="primary">
                  Acessar o app
                </CtaLink>
                <CtaLink href="/servicos" variant="ghost">
                  Ver os serviços
                </CtaLink>
              </div>
            </div>

            <div className="rounded-card overflow-hidden">
              <Image
                src={adocaoImage}
                alt="Mulher abraçando um filhote de cachorro no colo"
                placeholder="blur"
                priority
                sizes="(min-width: 1024px) 42vw, 92vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-white pt-6">
        <Container>
          <Heading>O que dá para fazer</Heading>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => (
              <li key={item.title} className="border-line rounded-card border bg-white p-7">
                <PawMark className="w-6" />
                <h3 className="text-ink font-display mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="text-ink-soft mt-2 leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="bg-sky-band/40">
        <Container>
          <Heading>Comece por um serviço</Heading>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/servicos/${service.slug}`}
                  className="group border-line hover:border-brand rounded-card block border bg-white p-6 transition-colors"
                >
                  <h3 className="text-ink group-hover:text-brand font-display text-lg font-semibold transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-ink-soft mt-2 text-sm leading-relaxed">{service.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="bg-white">
        <Container className="max-w-4xl">
          <Heading>Perguntas frequentes</Heading>
          <div className="mt-8">
            <FaqList entries={faq} />
          </div>
        </Container>
      </Section>

      <Section className="bg-cream">
        <Container className="max-w-3xl">
          <TutorCard />
        </Container>
      </Section>
    </>
  );
}
