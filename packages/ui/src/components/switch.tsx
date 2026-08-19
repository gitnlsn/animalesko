"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "../lib/cn.ts";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent press-feedback",
        // A halo, so the press is acknowledged without touching the track colour
        // that carries the on/off state.
        "active:ring-4 active:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-border",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          // The thumb keeps a slide — it is what makes the control read as a
          // switch — but at 100ms rather than the default 150ms, so the travel
          // finishes inside the tap instead of trailing behind the finger.
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform duration-100 ease-out",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
