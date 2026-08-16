"use client";

import { ListingDetailView } from "@animalesko/features/listing-detail-view";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * `/pet?id=…`, where the web app has `/pet/[id]`.
 *
 * A static export has to know every dynamic segment at build time — it needs
 * `generateStaticParams` and offers no fallback for an id it has not seen — and
 * the set of listings obviously is not known when the binary is built. A query
 * parameter sidesteps that entirely: one prerendered page, any id.
 *
 * The web app keeps the pretty `/pet/[id]` URL, which is what shared links
 * point at and what carries the OpenGraph tags. Deep-link handling maps one
 * onto the other.
 */
function PetDetail() {
  const id = useSearchParams().get("id");

  if (!id) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Pet não encontrado.</p>;
  }

  return <ListingDetailView id={id} />;
}

export default function PetPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <PetDetail />
    </Suspense>
  );
}
