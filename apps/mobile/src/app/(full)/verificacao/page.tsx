"use client";

import { VerificationScreen } from "@animalesko/features/verification-screen";

import { Gated } from "~/components/gated.tsx";
import { authClient } from "~/lib/auth-client.ts";

/**
 * Reads the full session rather than the `{signedIn, userId, name}` context the
 * shared components use, because the screen needs the e-mail and the
 * organization list. A client component throughout, so `metadata` cannot come
 * along — which costs nothing inside a WebView.
 */
export default function VerificationPage() {
  const session = authClient.useSession();
  const organizations = session.data?.organizations ?? [];

  return (
    <Gated next="/verificacao">
      <VerificationScreen
        email={session.data?.user.email}
        isProvider={organizations.length > 0}
        plusUrl={process.env.NEXT_PUBLIC_PLUS_URL ?? "https://plus.animalesko.org"}
      />
    </Gated>
  );
}
