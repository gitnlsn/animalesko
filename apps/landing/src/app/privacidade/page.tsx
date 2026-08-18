import { Breadcrumbs } from "~/components/breadcrumbs";
import { JsonLd } from "~/components/json-ld";
import { Container, Heading, Section } from "~/components/ui";
import { pageMetadata } from "~/lib/metadata";
import { APP_URL, backoffice, site } from "~/lib/site";
import { breadcrumbSchema } from "~/lib/structured-data";

import type { Metadata } from "next";

const trail = [
  { name: "Início", path: "/" },
  { name: "Privacidade", path: "/privacidade" },
];

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidade e LGPD",
  description:
    "Como a Animalesko coleta, usa e protege os dados informados neste site, e como exercer seus direitos previstos na LGPD (Lei nº 13.709/2018).",
  path: "/privacidade",
});

/**
 * The privacy notice for this site only.
 *
 * The landing collects one thing — name, e-mail and category, through the
 * "faça parte" form — so this page describes exactly that and nothing more.
 * The app and the back office handle their own data and carry their own
 * notices; claiming to cover them from here would be wrong.
 *
 * Not legal advice, and not a substitute for review by counsel before launch.
 */
export default function PrivacidadePage() {
  return (
    <>
      <JsonLd schema={breadcrumbSchema(trail)} />

      <Section className="bg-white">
        <Container className="max-w-3xl">
          <Breadcrumbs trail={trail} />

          <Heading as="h1" className="mt-6">
            Política de privacidade
          </Heading>
          <p className="text-ink-soft mt-4">
            Última atualização: agosto de 2026. Esta política descreve o tratamento de dados
            pessoais realizado neste site ({site.name}), conforme a Lei Geral de Proteção de Dados —
            Lei nº 13.709/2018.
          </p>

          <div className="prose-landing mt-10 flex flex-col gap-8">
            <section>
              <h2 className="text-ink font-display text-xl font-semibold">
                1. Quais dados coletamos
              </h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Neste site, coletamos apenas os dados que você digita no formulário “Faça parte do
                universo Animalesko”: <strong>nome</strong>, <strong>e-mail</strong> e a{" "}
                <strong>categoria</strong> que você escolhe (tutor, prestador de serviços ou ONG).
                Não pedimos CPF, telefone, endereço nem dados de pagamento nesta página.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">
                2. Para que usamos esses dados
              </h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Usamos seus dados para responder ao seu contato, avisar sobre novidades e
                oportunidades da plataforma e, no caso de prestadores e ONGs, conduzir o cadastro na
                rede. A base legal é o seu consentimento, dado ao enviar o formulário.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">
                3. Com quem compartilhamos
              </h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Não vendemos seus dados. Eles podem ser processados por fornecedores que operam a
                nossa infraestrutura (hospedagem do site e ferramenta de contato), sempre limitados
                à finalidade descrita acima e sujeitos a obrigações de confidencialidade.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">4. Por quanto tempo</h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Mantemos os dados enquanto durar o relacionamento ou até que você peça a remoção. A
                exclusão é feita em até 30 dias do pedido, salvo obrigação legal de retenção.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">5. Seus direitos</h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                A LGPD garante a você, entre outros, o direito de confirmar a existência do
                tratamento, acessar seus dados, corrigir dados incompletos ou desatualizados,
                solicitar anonimização ou eliminação, revogar o consentimento e se opor a
                tratamentos feitos em desacordo com a lei.
              </p>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Para exercer qualquer um deles, escreva para{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="text-brand underline underline-offset-4"
                >
                  {site.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">6. Cookies e medição</h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Este site não usa cookies de publicidade nem rastreadores de terceiros. As fontes
                são servidas pelo nosso próprio domínio, sem requisição a servidores externos.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">7. App e back office</h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Esta política cobre apenas este site. O app para tutores ({APP_URL}) e o back office
                para prestadores ({backoffice.hostname}) tratam dados próprios, necessários ao
                cadastro, ao agendamento e ao atendimento, e apresentam os respectivos avisos de
                privacidade no momento do cadastro.
              </p>
            </section>

            <section>
              <h2 className="text-ink font-display text-xl font-semibold">8. Contato</h2>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Dúvidas sobre esta política ou sobre o tratamento dos seus dados:{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="text-brand underline underline-offset-4"
                >
                  {site.email}
                </a>
                .
              </p>
            </section>
          </div>
        </Container>
      </Section>
    </>
  );
}
