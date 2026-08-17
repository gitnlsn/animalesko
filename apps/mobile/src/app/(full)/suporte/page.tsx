import { SupportScreen } from "@animalesko/features/support-screen";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ajuda & Suporte" };

/** Public: someone deciding whether to sign up should be able to read the FAQ. */
export default function Page() {
  return <SupportScreen />;
}
