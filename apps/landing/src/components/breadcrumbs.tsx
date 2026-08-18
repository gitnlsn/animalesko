import Link from "next/link";

/**
 * Visible breadcrumbs.
 *
 * The matching `BreadcrumbList` JSON-LD is emitted separately by each page.
 * Google's guidance is that structured data should describe what a visitor can
 * actually see, so the two always ship together — markup without the visible
 * trail is the kind of thing that gets a rich result revoked.
 *
 * The last crumb is the current page: it is text, not a link, and carries
 * `aria-current` so a screen reader announces where it is.
 */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-ink-soft text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;

          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-ink font-medium">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.path}
                    className="hover:text-brand underline-offset-4 hover:underline"
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
