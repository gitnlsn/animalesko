import { PaymentScreen } from "@animalesko/features/payment-screen";
import { requireSession } from "~/lib/require-session.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagamento" };

/**
 * Not prefetched: which booking is being paid comes from a search param, and
 * prefetching would mean reading it here only to hand the same id to the client
 * query anyway.
 *
 * The gate redirects back to Histórico rather than here, because a payment
 * screen without its booking is not somewhere to land after signing in.
 */
export default async function PaymentPage() {
  await requireSession("/historico");

  return <PaymentScreen />;
}
