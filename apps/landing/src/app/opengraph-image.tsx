import { ImageResponse } from "next/og";

import { PAW_OUTLINE_PATH, PAW_PAD_PATH, PAW_VIEWBOX } from "~/lib/paw-paths";

/**
 * The share card.
 *
 * Every link to animalesko.org posted in a WhatsApp group, a Facebook post or a
 * DM renders this image, which is most of what decides whether the link gets
 * opened. 1200×630 is the size Facebook, LinkedIn and X all crop from.
 *
 * Deliberately no `next/font` here: satori needs raw font data, and reaching
 * out for a font file would make image generation depend on the network. The
 * bundled default face is close enough for a card of six words.
 */

export const alt = "Animalesko — adoção, serviços pet e gestão para prestadores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="62" height="72" viewBox={PAW_VIEWBOX}>
          <path fill="#FFF0DE" d={PAW_OUTLINE_PATH} />
          <path fill="#2665AB" d={PAW_PAD_PATH} />
        </svg>
        <div style={{ display: "flex", fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: "#F5915C" }}>ANIMA</span>
          <span style={{ color: "#FFFFFF" }}>LESKO</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
          Adote, cuide, ame!
        </div>
        <div style={{ fontSize: 36, marginTop: 18, color: "#DFE9F3", lineHeight: 1.35 }}>
          Adoção, banho e tosa, creche, hospedagem, pet sitter e passeadores — com profissionais
          avaliados.
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, fontSize: 26, color: "#DFE9F3" }}>
        <span
          style={{
            background: "rgba(255,255,255,0.14)",
            padding: "10px 22px",
            borderRadius: 999,
          }}
        >
          Tutores · app.animalesko.org
        </span>
        <span
          style={{
            background: "rgba(255,255,255,0.14)",
            padding: "10px 22px",
            borderRadius: 999,
          }}
        >
          Prestadores · backoffice.animalesko.org
        </span>
      </div>
    </div>,
    { ...size },
  );
}
