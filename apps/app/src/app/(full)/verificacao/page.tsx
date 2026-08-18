import { VerificationScreen } from "@animalesko/features/verification-screen";
import { requireSession } from "~/lib/require-session.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verificação de Conta" };

export default async function VerificationPage() {
  const session = await requireSession("/verificacao");
  const organizations = session.organizations ?? [];

  return (
    <VerificationScreen
      email={session.user.email}
      isProvider={organizations.length > 0}
      plusUrl={process.env.NEXT_PUBLIC_PLUS_URL ?? "http://localhost:3001"}
    />
  );
}
