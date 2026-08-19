import { AdoptionView } from "@animalesko/features/adoption-view";
import { PetCardSkeleton, Skeleton } from "@animalesko/ui";
import { Suspense } from "react";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adoção" };

/**
 * The filters live in the URL, so `AdoptionView` reads `useSearchParams` — and
 * a statically exported page containing that hook has to declare a Suspense
 * boundary, because at build time there are no search params to read and the
 * subtree must bail out to the client.
 *
 * The fallback is the view's own pending state: search box, filter bar and
 * three cards. One card here was a ~576px growth spurt before a single byte of
 * data had arrived, which is a layout jump bought with a skeleton rather than
 * prevented by one.
 */
export default function AdoptionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {/* Sized off the real controls: the search `Input` is h-10 and the
              filter trigger is an auto-width `size="sm"` button, not a
              full-width bar. */}
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <PetCardSkeleton />
          <PetCardSkeleton />
          <PetCardSkeleton />
        </div>
      }
    >
      <AdoptionView />
    </Suspense>
  );
}
