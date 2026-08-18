import Link from "next/link";

import type { ComponentProps, ReactNode } from "react";

/**
 * The handful of primitives the marketing pages need.
 *
 * Deliberately not @animalesko/ui: every component in that package is a client
 * component built on Radix, and a landing page that ships a component runtime
 * to render six cards and a heading pays for it in Largest Contentful Paint.
 * These are plain server-rendered elements.
 */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Section({
  children,
  className = "",
  id,
  ...rest
}: { children: ReactNode; className?: string; id?: string } & ComponentProps<"section">) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`} {...rest}>
      {children}
    </section>
  );
}

/**
 * Section heading with an optional eyebrow.
 *
 * `as` exists because heading level is a document-structure decision, not a
 * styling one: a crawler and a screen reader both read the page by its heading
 * outline, so a section on the home page needs `h2` while the same visual
 * treatment at the top of a service page needs `h1`.
 */
export function Heading({
  as: Tag = "h2",
  eyebrow,
  children,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold tracking-[0.14em] text-accent uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Tag
        className={
          Tag === "h1"
            ? "text-ink text-3xl leading-tight font-semibold sm:text-5xl"
            : "text-ink text-2xl leading-tight font-semibold sm:text-4xl"
        }
      >
        {children}
      </Tag>
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-base font-medium transition-colors";

const buttonVariants = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-brand-sm",
  accent: "bg-accent text-white hover:bg-accent-dark shadow-brand-sm",
  outline: "border-2 border-brand text-brand hover:bg-brand hover:text-white",
  ghost: "text-ink hover:text-brand underline-offset-4 hover:underline",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

/**
 * A link styled as a button.
 *
 * `external` switches to a plain anchor: `next/link` prefetches, and prefetching
 * another origin is both useless and a needless request. It also adds
 * `rel="noopener"`, which every `target="_blank"` needs.
 */
export function CtaLink({
  href,
  variant = "primary",
  external = false,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  external?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"a">, "href">) {
  const classes = `${buttonBase} ${buttonVariants[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} rel="noopener" className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

/**
 * The FAQ accordion.
 *
 * `<details>` rather than a JavaScript disclosure widget: it is keyboard
 * accessible for free, and — the reason it matters here — the answer text is in
 * the HTML whether or not the panel is open, so it is available to a crawler
 * matching the FAQPage structured data against the visible page.
 */
export function FaqList({ entries }: { entries: { question: string; answer: string }[] }) {
  return (
    <div className="divide-line divide-y">
      {entries.map((entry) => (
        <details key={entry.question} className="group py-5">
          <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
            <span className="font-display">{entry.question}</span>
            <span
              aria-hidden="true"
              className="text-brand shrink-0 text-2xl leading-none transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="text-ink-soft mt-3 max-w-3xl leading-relaxed">{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}
