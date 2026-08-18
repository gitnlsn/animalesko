import Link from "next/link";

import { Logo } from "~/components/logo";
import { services } from "~/lib/content";
import { APP_URL, backoffice, site } from "~/lib/site";
import { Container } from "~/components/ui";

/**
 * The footer.
 *
 * It repeats every service link on purpose: a link in the footer of every page
 * is how the six service routes get crawled and how internal link equity
 * reaches them, and readers who scroll to the bottom are usually looking for
 * exactly this kind of index.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-line bg-brand-wash border-t">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="text-ink-soft font-display mt-4 max-w-xs text-lg">{site.tagline}</p>
            <p className="text-ink-soft mt-4 text-sm">
              Contato:{" "}
              <a
                className="hover:text-brand underline underline-offset-4"
                href={`mailto:${site.email}`}
              >
                {site.email}
              </a>
            </p>
          </div>

          <nav aria-labelledby="footer-servicos">
            <h2 id="footer-servicos" className="text-ink font-display text-base font-semibold">
              Serviços
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/servicos/${service.slug}`}
                    className="text-ink-soft hover:text-brand text-sm"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-navegacao">
            <h2 id="footer-navegacao" className="text-ink font-display text-base font-semibold">
              Navegação
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link href="/para-tutores" className="text-ink-soft hover:text-brand text-sm">
                  Para tutores
                </Link>
              </li>
              <li>
                <Link href="/para-prestadores" className="text-ink-soft hover:text-brand text-sm">
                  Para prestadores
                </Link>
              </li>
              <li>
                <Link href="/ongs" className="text-ink-soft hover:text-brand text-sm">
                  Para ONGs
                </Link>
              </li>
              <li>
                <Link href="/servicos" className="text-ink-soft hover:text-brand text-sm">
                  Todos os serviços
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-ink-soft hover:text-brand text-sm">
                  Privacidade e LGPD
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-acessos">
            <h2 id="footer-acessos" className="text-ink font-display text-base font-semibold">
              Acessos
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href={APP_URL}
                  rel="noopener"
                  className="text-ink-soft hover:text-brand block text-sm"
                >
                  <span className="text-ink block font-medium">App para tutores</span>
                  app.animalesko.org
                </a>
              </li>
              <li>
                {backoffice.isLive ? (
                  <a
                    href={backoffice.href!}
                    rel="noopener"
                    className="text-ink-soft hover:text-brand block text-sm"
                  >
                    <span className="text-ink block font-medium">Back office do prestador</span>
                    {backoffice.hostname}
                  </a>
                ) : (
                  <div className="text-ink-soft text-sm">
                    <span className="text-ink block font-medium">Back office do prestador</span>
                    {backoffice.hostname}{" "}
                    <span className="text-accent-dark font-semibold">(em breve)</span>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-line/80 text-ink-soft mt-12 flex flex-col gap-2 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. Todos os direitos reservados.
          </p>
          <p>Feito no Brasil, para quem ama animais.</p>
        </div>
      </Container>
    </footer>
  );
}
