import * as React from "react";

import { cn } from "../lib/cn.ts";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden {...props} />
  );
}
