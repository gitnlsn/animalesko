"use client";

import { Button } from "@animalesko/ui";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * The theme is only known on the client, so the first render must not commit to
 * an icon — doing so mismatches the server HTML and React discards the tree.
 * The placeholder keeps the button's size stable through that swap.
 *
 * `resolvedTheme` is `undefined` until next-themes has read the DOM, which is
 * the mount signal itself — no `useState`/`useEffect` pair needed, and none
 * wanted: setting state synchronously in an effect is exactly the cascading
 * render React 19 warns about.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  if (!resolvedTheme) {
    return (
      <Button variant="outline" size="icon" disabled aria-hidden>
        <span className="size-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="transition-smooth hover:scale-105"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      <span className="sr-only">{isDark ? "Modo claro" : "Modo escuro"}</span>
    </Button>
  );
}
