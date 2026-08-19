import { Card, CardContent } from "./card.tsx";
import { Skeleton } from "./skeleton.tsx";
import { cn } from "../lib/cn.ts";

/**
 * Placeholders shaped like the screen that is loading.
 *
 * A one-line "Carregando…" tells the reader that something is happening but not
 * what is coming, so the layout jumps the moment data lands and the wait feels
 * longer than it is. These mirror the real components' geometry — same card
 * heights, same rows, same grid — so the arriving data drops into the space it
 * already occupies and the transition reads as filling in rather than
 * replacing.
 *
 * They are deliberately dumb: no data, no hooks, no timing logic. A screen
 * renders one while its query is pending and swaps it for the real thing, which
 * keeps the decision about *when* to show a placeholder next to the query that
 * knows.
 */

/** Rows of cards — the shape of every list screen (pets, services, history). */
export function ListSkeleton({
  count = 3,
  className,
  withMedia = false,
}: {
  count?: number;
  className?: string;
  /** Leaves room for a leading thumbnail, as the pet and favourite cards do. */
  withMedia?: boolean;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex gap-3 p-4">
            {withMedia ? <Skeleton className="size-20 shrink-0 rounded-lg" /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** The two- or three-up counters that head the home and profile screens. */
export function StatGridSkeleton({
  count = 2,
  className,
  detailed = false,
}: {
  count?: number;
  className?: string;
  /**
   * Match `StatsCard` — subtitle line under the value, icon tile beside it —
   * rather than a bare counter.
   *
   * The plain shape is 76px tall and `StatsCard` is 108px (both are `p-4` over
   * a 76px body; the counter's body is only 44px), so using it on the home
   * screen left a 32px step that closed the moment the counts landed.
   */
  detailed?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", count === 3 ? "grid-cols-3" : "grid-cols-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className={cn("p-4", !detailed && "space-y-2")}>
            {detailed ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="size-12 shrink-0 rounded-lg" />
              </div>
            ) : (
              <>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Avatar, name and counters — the head of the profile screen. */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-52" />
      </div>
      <StatGridSkeleton count={3} />
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    </div>
  );
}

/** A conversation: alternating bubbles of uneven width. */
export function ThreadSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton
            className={cn(
              "h-12 rounded-2xl",
              i % 3 === 0 ? "w-3/5" : i % 3 === 1 ? "w-2/5" : "w-4/5",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The gradient bar every secondary screen opens with.
 *
 * Screens that render a `PageHeader` were showing placeholders that did not
 * include one, so the bar appeared at the top the moment data landed and pushed
 * everything down. A skeleton that omits the one element guaranteed to be there
 * buys a layout jump rather than preventing one.
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-gradient-primary px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg bg-gradient-foreground/20" />
        <Skeleton className="h-5 w-40 bg-gradient-foreground/20" />
      </div>
    </div>
  );
}

/** One adoption card, shaped like `PetCard`: photo above, details below. */
export function PetCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <Skeleton className="aspect-4/3 w-full rounded-none" />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>

        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />

        <div className="flex items-center justify-between gap-2 pt-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

/**
 * A full secondary screen: header bar, full-bleed photo, then the body.
 *
 * The photo is deliberately outside the padded container, because the real one
 * is — a skeleton that insets it by 16px each side makes the image visibly jump
 * outward when it loads.
 */
export function DetailScreenSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-dvh bg-background", className)}>
      <PageHeaderSkeleton />
      <Skeleton className="aspect-4/3 w-full rounded-none" />

      <div className="mx-auto max-w-md space-y-4 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-1/3" />

        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** A single record: title block over stacked detail rows. */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </CardContent>
      </Card>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
