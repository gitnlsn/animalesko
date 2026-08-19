"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn.ts";

const buttonVariants = cva(
  // `press-feedback` rather than a plain transition: the press has to land the
  // instant the finger does. The scale is 95% rather than the 98% this started
  // with because a 2% change is below the threshold most people notice on a
  // phone, which made every button feel like it had missed the tap.
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap press-feedback active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-dark active:bg-primary-dark",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        success: "bg-success text-success-foreground hover:bg-success/90 active:bg-success/80",
        outline: "border border-border bg-background hover:bg-muted active:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground active:bg-muted",
        link: "text-primary underline-offset-4 hover:underline active:opacity-80",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks interaction. Prefer this over disabling manually. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  // Slot requires exactly one child element — even a `null` sibling makes the
  // children an array and throws. So asChild takes a separate return that
  // forwards `children` untouched, and never renders the spinner.
  //
  // `loading` still has to do something here. It previously did not, which made
  // `<Button asChild loading={…}><Link/></Button>` structurally incapable of
  // showing pending state: the caller passed the flag, read the prop list, and
  // reasonably assumed it worked. With no room for a spinner the state is
  // carried the way `disabled` already carries it — dimmed and inert — plus
  // `aria-busy` so it is not a purely visual claim.
  if (asChild) {
    return (
      <Slot
        className={cn(classes, loading && "pointer-events-none opacity-50")}
        aria-busy={loading || undefined}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { buttonVariants };
