import { PAW_OUTLINE_PATH, PAW_PAD_PATH, PAW_VIEWBOX } from "~/lib/paw-paths";

/**
 * The Animalesko paw.
 *
 * It stands in for the "O" of ANIMALESKO in the wordmark, so when it is drawn
 * next to the letters it must stay `aria-hidden` — the accessible name comes
 * from the wordmark, and a second "paw" announcement would only add noise. Pass
 * `title` only when the paw appears on its own.
 */
export function PawMark({
  className,
  outlineColor = "#2665AB",
  padColor = "#FFF0DE",
  title,
}: {
  className?: string;
  outlineColor?: string;
  padColor?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={PAW_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path fill={outlineColor} d={PAW_OUTLINE_PATH} />
      <path fill={padColor} d={PAW_PAD_PATH} />
    </svg>
  );
}
