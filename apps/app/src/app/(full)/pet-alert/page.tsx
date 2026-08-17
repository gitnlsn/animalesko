import { PetAlertScreen } from "@animalesko/features/pet-alert-screen";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pet Alert",
  description: "Pets perdidos e encontrados perto de você.",
};

/**
 * Public, and nothing is prefetched — the query depends on the visitor's
 * coordinates, which only the browser knows.
 */
export default function PetAlertPage() {
  return <PetAlertScreen />;
}
