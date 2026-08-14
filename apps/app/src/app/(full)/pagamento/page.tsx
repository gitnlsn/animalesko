import { PageHeader } from "~/components/page-header.tsx";
import { PaymentView } from "~/components/payment-view.tsx";
import { requireSession } from "~/lib/require-session.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagamento" };

/**
 * Not prefetched: which booking is being paid comes from a search param, and
 * prefetching would mean reading it here only to hand the same id to the client
 * query anyway.
 */
export default async function PaymentPage() {
  await requireSession("/historico");

  return (
    <>
      <PageHeader title="Pagamento" backTo="/historico" />
      <main className="mx-auto max-w-md p-4">
        <PaymentView />
      </main>
    </>
  );
}
