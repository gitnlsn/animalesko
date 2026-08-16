import { AdoptionView } from "@animalesko/features/adoption-view";
import { Skeleton } from "@animalesko/ui";
import { Suspense } from "react";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adoção" };

/**
 * The filters live in the URL, so `AdoptionView` reads `useSearchParams` — and
 * a statically exported page containing that hook has to declare a Suspense
 * boundary, because at build time there are no search params to read and the
 * subtree must bail out to the client.
 */
export default function AdoptionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      }
    >
      <AdoptionView />
    </Suspense>
  );
}
