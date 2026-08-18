import { services } from "~/lib/content";
import { absoluteUrl } from "~/lib/site";

import type { MetadataRoute } from "next";

/**
 * /sitemap.xml
 *
 * Generated from the same `services` array the pages render from, so a new
 * service is discoverable the moment it is added — the failure mode of a
 * hand-written sitemap is that it silently stops matching the site.
 *
 * `lastModified` is the build time. For a marketing site that is honest: the
 * content only changes when the site is redeployed.
 *
 * `priority` is a hint about relative importance within this site only. Search
 * engines largely ignore it, but it costs nothing and it does document intent.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: absoluteUrl("/"), priority: 1, changeFrequency: "weekly" },
      { url: absoluteUrl("/servicos"), priority: 0.9, changeFrequency: "weekly" },
      { url: absoluteUrl("/para-tutores"), priority: 0.9, changeFrequency: "monthly" },
      { url: absoluteUrl("/para-prestadores"), priority: 0.9, changeFrequency: "monthly" },
      { url: absoluteUrl("/ongs"), priority: 0.7, changeFrequency: "monthly" },
      { url: absoluteUrl("/privacidade"), priority: 0.3, changeFrequency: "yearly" },
    ] satisfies Omit<MetadataRoute.Sitemap[number], "lastModified">[]
  ).map((route) => ({ ...route, lastModified }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: absoluteUrl(`/servicos/${service.slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
    // An image sitemap entry gives the photo on each service page its own shot
    // at Google Images, which is a real traffic source for pet-care queries.
    images: [absoluteUrl(service.image.src)],
  }));

  return [...staticRoutes, ...serviceRoutes];
}
