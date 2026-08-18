import { Breadcrumbs } from "~/components/breadcrumbs";
import { JsonLd } from "~/components/json-ld";
import { LeadForm } from "~/components/lead-form";
import { PawMark } from "~/components/paw-mark";
import { Container, CtaLink, FaqList, Heading, Section } from "~/components/ui";
import { pageMetadata } from "~/lib/metadata";
import { APP_URL } from "~/lib/site";
import { breadcrumbSchema, faqSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

const trail = [
  { name: "Início", path: "/" },
  { name: "ONGs", path: "/ongs" },
];

export const metadata: Metadata = pageMetadata({
  title: "Para ONGs e protetores de animais",
  description:
    "Cadastre os animais da sua ONG, alcance adotantes de verdade e organize o processo de adoção com a Animalesko. Apoio para quem luta contra o abandono.",
  path: "/ongs",
  keywords: [
    "ONG de animais",
    "divulgar animais para adoção",
    "protetor independente",
    "gestão de ONG animal",
  ],
});

const faq = [
  {
    question: "Minha ONG precisa ser registrada (CNPJ) para participar?",
    answer:
      "Não necessariamente. Protetores independentes e grupos informais também podem participar. Nossa equipe conversa com cada parceiro para entender como o resgate funciona antes de liberar o cadastro.",
  },
  {
    question: "A Animalesko cobra alguma taxa das ONGs?",
    answer:
      "Não. A divulgação dos animais para adoção é gratuita para ONGs e protetores parceiros. A missão da plataforma é reduzir o abandono, e cobrar de quem resgata trabalharia contra isso.",
  },
  {
    question: "Quem decide se uma adoção é aprovada?",
    answer:
      "Sempre a ONG ou o protetor responsável pelo animal. A Animalesko aproxima as pessoas e organiza a informação; o critério de adoção continua sendo de quem cuidou do animal até ali.",
  },
];

const supports = [
  {
    title: "Animais com perfil completo",
    body: "Idade, porte, temperamento, histórico de saúde e fotos. Quanto mais claro o perfil, menos devolução depois.",
  },
  {
    title: "Alcance de quem quer adotar",
    body: "Seus animais aparecem para tutores que estão procurando adoção na região, dentro do app.",
  },
  {
    title: "Processo organizado",
    body: "Interessados, conversas e status de cada animal em um lugar só, em vez de espalhados por várias redes sociais.",
  },
  {
    title: "Rede de apoio",
    body: "Prestadores parceiros e uma comunidade de tutores que ajuda a divulgar campanhas e alertas de animais perdidos.",
  },
];

export default function OngsPage() {
  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), faqSchema(faq)]} />

      <Section className="from-brand-wash bg-gradient-to-b to-white pb-10">
        <Container>
          <Breadcrumbs trail={trail} />

          <div className="mt-8 max-w-3xl">
            <Heading as="h1" eyebrow="ONGs de animais">
              Apoio para quem já faz o trabalho mais difícil
            </Heading>
            <p className="text-ink-soft mt-5 text-lg leading-relaxed">
              Conectamos pets às pessoas certas e oferecemos suporte na organização da sua ONG. Você
              cadastra os animais resgatados, acompanha quem demonstrou interesse e conduz a adoção
              do seu jeito — a decisão final é sempre de quem cuidou do animal.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href="#contato" variant="primary">
                Cadastrar minha ONG
              </CtaLink>
              <CtaLink href={APP_URL} external variant="ghost">
                Ver o app
              </CtaLink>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-white pt-6">
        <Container>
          <Heading>Como a plataforma ajuda</Heading>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {supports.map((item) => (
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
        <Container className="max-w-4xl">
          <Heading>Perguntas frequentes</Heading>
          <div className="mt-8">
            <FaqList entries={faq} />
          </div>
        </Container>
      </Section>

      <Section id="contato" className="bg-cream">
        <Container className="max-w-3xl">
          <Heading className="text-center">Vamos conversar</Heading>
          <p className="text-ink-soft mx-auto mt-4 max-w-xl text-center text-lg">
            Deixe seu contato e nossa equipe fala com você sobre o cadastro da sua ONG na rede.
          </p>
          <div className="mt-10">
            <LeadForm defaultCategory="ONG de animais" />
          </div>
        </Container>
      </Section>
    </>
  );
}
