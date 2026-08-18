import { absoluteUrl, isIndexable, SITE_URL } from "~/lib/site";

import type { MetadataRoute } from "next";

/**
 * /robots.txt
 *
 * A preview deployment gets a blanket `Disallow: /`. This is the belt to the
 * `noindex` braces in the metadata: a crawler that ignores meta robots still
 * reads robots.txt, and a staging copy of the site ranking against production
 * for its own brand name is a genuinely expensive mistake to undo.
 *
 * `host` names the canonical hostname for crawlers that honour it, which is one
 * more signal that the www and non-www forms are the same site.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing under /api is a page; keeping crawlers out of it saves
        // crawl budget for the routes that can actually rank.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
