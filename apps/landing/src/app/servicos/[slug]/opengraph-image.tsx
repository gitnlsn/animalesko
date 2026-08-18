import { ImageResponse } from "next/og";

import { getService, services } from "~/lib/content";
import { PAW_OUTLINE_PATH, PAW_PAD_PATH, PAW_VIEWBOX } from "~/lib/paw-paths";

/**
 * A share card per service.
 *
 * The obvious alternative — pointing og:image at the service photo — looks
 * wrong in practice: those photos are portrait, and every platform crops share
 * images to roughly 1.91:1, so a tall picture of a dog arrives as a slice of
 * its middle. This renders the real card size with the service name on it, so
 * a link to /servicos/creche-pet shared in a group is legible as that.
 */

export const alt = "Animalesko";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #2665AB 0%, #1C4C82 55%, #163E6B 100%)",
        color: "#FFFFFF",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="52" height="60" viewBox={PAW_VIEWBOX}>
          <path fill="#FFF0DE" d={PAW_OUTLINE_PATH} />
          <path fill="#2665AB" d={PAW_PAD_PATH} />
        </svg>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: "#F5915C" }}>ANIMA</span>
          <span style={{ color: "#FFFFFF" }}>LESKO</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{ fontSize: 30, color: "#F5915C", letterSpacing: 4, textTransform: "uppercase" }}
        >
          Serviços para pets
        </div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            marginTop: 16,
          }}
        >
          {service?.heading ?? "Serviços para pets"}
        </div>
        <div style={{ fontSize: 32, marginTop: 20, color: "#DFE9F3", lineHeight: 1.35 }}>
          {service?.summary ?? "Profissionais avaliados por outros tutores."}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 26, color: "#DFE9F3" }}>
        <span
          style={{ background: "rgba(255,255,255,0.14)", padding: "10px 22px", borderRadius: 999 }}
        >
          animalesko.org
        </span>
      </div>
    </div>,
    { ...size },
  );
}
