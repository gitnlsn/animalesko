"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

/**
 * One toast system.
 *
 * Both prototypes shipped two in parallel — a custom `use-toast` reducer plus
 * Sonner — mounted side by side in App.tsx, so a message could appear in
 * either. This is the only one.
 */
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      {...props}
    />
  );
}

export { toast };
