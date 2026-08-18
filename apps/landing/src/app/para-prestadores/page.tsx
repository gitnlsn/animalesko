import { Breadcrumbs } from "~/components/breadcrumbs";
import { JsonLd } from "~/components/json-ld";
import { LeadForm } from "~/components/lead-form";
import { PawMark } from "~/components/paw-mark";
import { Container, CtaLink, FaqList, Heading, Section } from "~/components/ui";
import { pageMetadata } from "~/lib/metadata";
import { backoffice, site } from "~/lib/site";
import { breadcrumbSchema, faqSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

const trail = [
  { name: "Início", path: "/" },
  { name: "Para prestadores", path: "/para-prestadores" },
];

export const metadata: Metadata = pageMetadata({
  title: "Para prestadores: o back office da Animalesko",
  description:
    "Banho e tosa, creche, hotel, pet sitter, passeador ou clínica: gerencie agenda, clientes, serviços e faturamento em backoffice.animalesko.org e apareça para tutores da sua região.",
  path: "/para-prestadores",
  keywords: [
    "sistema para petshop",
    "gestão de banho e tosa",
    "agenda para creche de cães",
    "software para clínica veterinária",
    "cadastro de prestador pet",
  ],
});

const faq = [
  {
    question: "Qual é o endereço do back office?",
    answer:
      "backoffice.animalesko.org. É a área de gestão dos prestadores de serviço, separada do app usado pelos tutores (app.animalesko.org). Cada um tem o seu endereço porque as duas ferramentas fazem coisas diferentes.",
  },
  {
    question: "Que tipo de negócio pode se cadastrar?",
    answer:
      "Banho e tosa, creches, hotéis e famílias hospedeiras, pet sitters, passeadores, clínicas veterinárias e profissionais autônomos que atendem pets. Se o seu serviço cuida de animais, ele cabe na rede.",
  },
  {
    question: "Preciso instalar algum programa?",
    answer:
      "Não. O back office funciona no navegador, no computador do balcão ou no celular durante o atendimento.",
  },
  {
    question: "Como faço para começar?",
    answer:
      "Deixe seu contato no formulário desta página. Nossa equipe fala com você, entende o seu serviço e faz a habilitação do acesso ao back office.",
  },
];

const features = [
  {
    title: "Agenda no controle",
    body: "Horários, confirmações e histórico de atendimentos em uma agenda só — sem caderno, sem conversa perdida no WhatsApp.",
  },
  {
    title: "Clientes e pets fichados",
    body: "Cada tutor com os seus animais, restrições, preferências e o que já foi feito em cada visita.",
  },
  {
    title: "Serviços e preços",
    body: "Monte o seu catálogo com duração e valor, e mostre exatamente o que você faz para quem está procurando.",
  },
  {
    title: "Faturamento acompanhado",
    body: "O que foi prestado, o que foi pago e o que está em aberto, sem planilha paralela.",
  },
  {
    title: "Visibilidade na rede",
    body: "Seu negócio aparece para os tutores que buscam o seu serviço na sua região, com o seu perfil e as suas avaliações.",
  },
  {
    title: "Reputação que fica com você",
    body: "As avaliações vêm de atendimentos reais feitos pela plataforma e ficam registradas no seu perfil.",
  },
];

export default function ParaPrestadoresPage() {
  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), faqSchema(faq)]} />

      <Section className="from-cream bg-gradient-to-b to-white pb-10">
        <Container>
          <Breadcrumbs trail={trail} />

          <div className="mt-8 max-w-3xl">
            <Heading as="h1" eyebrow="Para prestadores">
              A gestão do seu negócio pet em um só lugar
            </Heading>
            <p className="text-ink-soft mt-5 text-lg leading-relaxed">
              Se você oferece serviços ou cuidados para pets, venha fazer parte da nossa rede. O
              back office da Animalesko reúne agenda, clientes, serviços prestados e faturamento — e
              coloca o seu trabalho na frente dos tutores que estão procurando por ele.
            </p>

            {/*
              The subdomain is printed whether or not it resolves yet. People
              remember addresses, and "where do I log in?" is the first question
              a new partner asks.
            */}
            <div className="border-accent-soft rounded-card mt-8 border bg-white p-6">
              <p className="text-ink-soft text-sm font-medium">Endereço do back office</p>
              <p className="mt-2 flex flex-wrap items-center gap-3">
                <code className="text-brand font-mono text-lg font-semibold">
                  {backoffice.hostname}
                </code>
                {backoffice.isLive ? null : (
                  <span className="bg-accent-soft text-accent-dark rounded-full px-3 py-1 text-xs font-semibold">
                    em configuração
                  </span>
                )}
              </p>
              <p className="text-ink-soft mt-3 text-sm leading-relaxed">
                {backoffice.isLive
                  ? "Entre com a conta que a nossa equipe habilitou para o seu negócio."
                  : "O apontamento do domínio está sendo finalizado pela nossa equipe de rede. Deixe seu contato abaixo e avisamos assim que o acesso estiver liberado."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {backoffice.isLive ? (
                  <CtaLink href={backoffice.href!} external variant="accent">
                    Entrar no back office
                  </CtaLink>
                ) : (
                  <CtaLink href="#contato" variant="accent">
                    Quero ser avisado
                  </CtaLink>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-white pt-6">
        <Container>
          <Heading>O que você resolve no back office</Heading>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li key={feature.title} className="border-line rounded-card border bg-white p-7">
                <PawMark className="w-6" />
                <h3 className="text-ink font-display mt-4 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="text-ink-soft mt-2 leading-relaxed">{feature.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="bg-sky-band/40">
        <Container className="max-w-4xl">
          <Heading>Perguntas frequentes</Heading>
          <div className="mt-8">
            <FaqList entries={faq} />
          </div>
        </Container>
      </Section>

      <Section id="contato" className="bg-white">
        <Container className="max-w-3xl">
          <Heading className="text-center">Quero fazer parte da rede {site.name}</Heading>
          <p className="text-ink-soft mx-auto mt-4 max-w-xl text-center text-lg">
            Deixe seu nome e e-mail. Nossa equipe entra em contato para entender o seu serviço e
            liberar o acesso ao back office.
          </p>
          <div className="mt-10">
            <LeadForm defaultCategory="Serviços para pets" />
          </div>
        </Container>
      </Section>
    </>
  );
}
