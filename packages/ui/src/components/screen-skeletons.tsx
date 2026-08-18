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
export function StatGridSkeleton({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", count === 3 ? "grid-cols-3" : "grid-cols-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10" />
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
