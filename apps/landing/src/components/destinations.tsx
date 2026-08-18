import { CtaLink } from "~/components/ui";
import { APP_URL, backoffice } from "~/lib/site";

/**
 * The fork in the road.
 *
 * A visitor arriving at animalesko.org is one of two people, and they need
 * opposite things: a tutor needs the app, a service provider needs the back
 * office. Sending both to the same "entrar" button is how a provider ends up
 * with a consumer account. So the split is stated in plain language, with the
 * destination host printed on the card — people do recognise a subdomain, and
 * they will type it directly next time.
 *
 * The back-office host is not pointed at its deployment yet, so it renders as
 * text with an "em breve" badge instead of a dead link. See `backoffice` in
 * lib/site.ts: setting NEXT_PUBLIC_BACKOFFICE_URL flips every one of these into
 * a real link.
 */

function Address({ host, live }: { host: string; live: boolean }) {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <code className="text-brand rounded-md bg-white/70 px-2 py-1 font-mono text-[0.8125rem] font-semibold">
        {host}
      </code>
      {live ? null : (
        <span className="bg-accent-soft text-accent-dark rounded-full px-2 py-0.5 text-xs font-semibold">
          em breve
        </span>
      )}
    </p>
  );
}

export function TutorCard() {
  return (
    <article className="border-brand-soft rounded-card bg-brand-wash flex flex-col border p-7 sm:p-9">
      <p className="text-brand text-sm font-semibold tracking-[0.14em] uppercase">Para tutores</p>
      <h3 className="text-ink font-display mt-3 text-2xl font-semibold sm:text-3xl">
        Quero cuidar do meu pet
      </h3>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Encontre banho e tosa, creche, hospedagem, passeadores e pet sitters perto de você, veja
        avaliações de outros tutores e agende em poucos toques. É também onde você conhece os
        animais disponíveis para adoção.
      </p>
      <Address host="app.animalesko.org" live />
      <p className="text-ink-soft mt-3 text-sm">
        Funciona no navegador do computador e do celular — não precisa instalar nada.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <CtaLink href={APP_URL} external variant="primary">
          Acessar o app
        </CtaLink>
        <CtaLink href="/para-tutores" variant="ghost">
          Ver o que dá para fazer
        </CtaLink>
      </div>
    </article>
  );
}

export function ProviderCard() {
  return (
    <article className="border-accent-soft rounded-card bg-cream flex flex-col border p-7 sm:p-9">
      <p className="text-accent-dark text-sm font-semibold tracking-[0.14em] uppercase">
        Para prestadores
      </p>
      <h3 className="text-ink font-display mt-3 text-2xl font-semibold sm:text-3xl">
        Ofereço serviços para pets
      </h3>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Banho e tosa, creche, hotel, pet sitter, passeador ou clínica: o back office reúne agenda,
        clientes, serviços prestados e faturamento no mesmo lugar, e coloca o seu negócio na frente
        de quem está procurando por ele.
      </p>
      <Address host={backoffice.hostname} live={backoffice.isLive} />
      <p className="text-ink-soft mt-3 text-sm">
        {backoffice.isLive
          ? "Entre com a mesma conta que você usa no atendimento do dia a dia."
          : "O endereço está em configuração. Deixe seu contato e avisamos assim que ele estiver no ar."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {backoffice.isLive ? (
          <CtaLink href={backoffice.href!} external variant="accent">
            Entrar no back office
          </CtaLink>
        ) : (
          <CtaLink href="/para-prestadores#contato" variant="accent">
            Quero ser parceiro
          </CtaLink>
        )}
        <CtaLink href="/para-prestadores" variant="ghost">
          Como funciona
        </CtaLink>
      </div>
    </article>
  );
}

export function Destinations() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TutorCard />
      <ProviderCard />
    </div>
  );
}
