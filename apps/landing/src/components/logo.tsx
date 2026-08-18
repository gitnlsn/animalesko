import Link from "next/link";

import { PawMark } from "~/components/paw-mark";

/**
 * The Animalesko wordmark: ANIMA in orange, LESK in blue, and the paw standing
 * in for the final O — exactly how the brand file draws it.
 *
 * The original used a licensed display face (SeanHenrichATF) that cannot ship
 * here. Fredoka is the closest available match and is already the heading font
 * of the site, so the wordmark and the headlines stay in the same voice.
 *
 * The whole thing is one accessible name, "Animalesko": the letters are text,
 * the paw is decorative, and a screen reader announces the brand once.
 */
export function Logo({ className = "", href = "/" }: { className?: string; href?: string | null }) {
  const content = (
    <span
      className={`font-display inline-flex items-baseline gap-[0.06em] text-2xl leading-none font-semibold tracking-tight sm:text-[1.75rem] ${className}`}
    >
      <span className="text-accent">
        ANIMA<span className="text-brand">LESK</span>
      </span>
      <PawMark className="w-[0.72em] translate-y-[0.06em] self-center" />
      <span className="sr-only">O</span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="Animalesko — página inicial" className="inline-flex">
      {content}
    </Link>
  );
}
