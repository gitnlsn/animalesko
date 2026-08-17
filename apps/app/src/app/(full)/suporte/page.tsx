import { SupportScreen } from "@animalesko/features/support-screen";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajuda & Suporte",
  description: "Dúvidas frequentes sobre adoção, serviços e Pet Alert na Animalesko.",
};

/** Public: someone deciding whether to sign up should be able to read the FAQ. */
export default function SupportPage() {
  return <SupportScreen />;
}
