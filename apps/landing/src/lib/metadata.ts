import { absoluteUrl, isIndexable, site } from "~/lib/site";

import type { Metadata } from "next";

/**
 * Per-page metadata, built from one place.
 *
 * Next merges metadata down the layout tree, so anything set in the root layout
 * (title template, openGraph.siteName, metadataBase, robots) is already
 * inherited here. What this helper adds is the part that is genuinely per-page
 * and easy to forget: a self-referencing canonical URL, and an openGraph.url
 * that matches it.
 *
 * A wrong canonical is worse than no canonical — it hands your ranking to
 * another URL — so `path` is required rather than defaulted.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  /** Route path with a leading slash, e.g. "/servicos/banho-e-tosa". */
  path: string;
  keywords?: readonly string[];
  /** Absolute or root-relative image URL. Falls back to the generated OG image. */
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);

  /*
   * Set explicitly rather than left to the `opengraph-image.tsx` file
   * convention. Metadata objects merge shallowly, so a page that exports
   * `openGraph` at all replaces the parent's entire `openGraph` block — leaving
   * a share card with a title, a description and no image. Naming the image on
   * every page removes the question.
   */
  const socialImage = image ?? absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    /*
     * Spread rather than `keywords: keywords ?? undefined`. Metadata merges
     * shallowly by key, and a key present with the value `undefined` still
     * counts as present — it would erase the site-wide keyword list inherited
     * from the root layout instead of falling through to it.
     */
    ...(keywords ? { keywords: [...keywords] } : {}),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: site.name,
      locale: site.locale,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
    robots: isIndexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            // Let Google use full-size thumbnails and untruncated snippets;
            // both make the result larger and more clickable.
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
  };
}
