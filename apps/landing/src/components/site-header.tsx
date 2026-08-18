import Link from "next/link";

import { Logo } from "~/components/logo";
import { Container, CtaLink } from "~/components/ui";
import { APP_URL, backoffice, primaryNav } from "~/lib/site";

/**
 * The header.
 *
 * The mobile menu is a `<details>` element rather than a React disclosure: it
 * opens and closes with no JavaScript at all, which keeps the landing shipping
 * zero client components. The trade-off is that it cannot animate or close on
 * outside click — neither of which is worth a hydration pass on a page whose
 * job is to load fast and hand the visitor to one of two subdomains.
 */
export function SiteHeader() {
  return (
    <header className="border-line/70 sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink hover:text-brand text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {backoffice.isLive ? (
            <CtaLink
              href={backoffice.href!}
              external
              variant="outline"
              className="px-5 py-2 text-sm"
            >
              Sou prestador
            </CtaLink>
          ) : (
            <CtaLink href="/para-prestadores" variant="outline" className="px-5 py-2 text-sm">
              Sou prestador
            </CtaLink>
          )}
          <CtaLink href={APP_URL} external variant="primary" className="px-5 py-2 text-sm">
            Acessar o app
          </CtaLink>
        </div>

        <details className="group relative lg:hidden">
          <summary
            className="text-ink border-line flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border"
            aria-label="Abrir menu de navegação"
          >
            <span aria-hidden="true" className="flex flex-col gap-[5px]">
              <span className="bg-ink block h-[2px] w-5 rounded-full" />
              <span className="bg-ink block h-[2px] w-5 rounded-full" />
              <span className="bg-ink block h-[2px] w-5 rounded-full" />
            </span>
          </summary>

          <nav
            aria-label="Principal (celular)"
            className="border-line shadow-brand absolute right-0 z-50 mt-3 w-64 rounded-2xl border bg-white p-4"
          >
            <ul className="flex flex-col gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink hover:bg-brand-wash block rounded-lg px-3 py-3 text-sm font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-2">
              <CtaLink href={APP_URL} external variant="primary" className="py-2 text-sm">
                Acessar o app
              </CtaLink>
              <CtaLink
                href={backoffice.isLive ? backoffice.href! : "/para-prestadores"}
                external={backoffice.isLive}
                variant="outline"
                className="py-2 text-sm"
              >
                Sou prestador
              </CtaLink>
            </div>
          </nav>
        </details>
      </Container>
    </header>
  );
}
