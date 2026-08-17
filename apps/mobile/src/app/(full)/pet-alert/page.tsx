import { PetAlertScreen } from "@animalesko/features/pet-alert-screen";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pet Alert" };

/** Public: filing an alert still needs a session, handled inside the board. */
export default function Page() {
  return <PetAlertScreen />;
}
