import { MyPetsScreen } from "@animalesko/features/my-pets-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus Pets" };

/**
 * The greeting that made this page a client component now lives in
 * `MyPetsScreen`, which reads the session context for itself — so the shell is
 * a plain module again and can export `metadata` like its siblings.
 */
export default function Page() {
  return (
    <Gated next="/meus-pets">
      <MyPetsScreen />
    </Gated>
  );
}
