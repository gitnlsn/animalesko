import { site } from "~/lib/site";

import type { MetadataRoute } from "next";

/**
 * /manifest.webmanifest
 *
 * The landing itself is not an app to install — the consumer app lives on
 * app.animalesko.org. The manifest is here for the metadata a browser reads
 * from it anyway: the name and theme colour used when someone adds the page to
 * a home screen, and the icon set Android and Chrome pick from.
 *
 * `purpose: "maskable"` on the 512 icon matters: without a maskable variant,
 * Android crops the square icon into a circle and clips the paw.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — adoção e serviços para pets`,
    short_name: site.name,
    description: site.description,
    lang: site.language,
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#2665AB",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
