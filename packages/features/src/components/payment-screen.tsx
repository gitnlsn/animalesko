"use client";

import { PageHeader } from "./page-header.tsx";
import { PaymentView } from "./payment-view.tsx";

/**
 * Pagamento.
 *
 * Nothing is prefetched on either host: which booking is being paid comes from
 * a search param, which the view reads for itself. Back goes to Histórico,
 * where the payment was started.
 */
export function PaymentScreen() {
  return (
    <>
      <PageHeader title="Pagamento" backTo="/historico" />
      <main className="mx-auto max-w-md p-4">
        <PaymentView />
      </main>
    </>
  );
}
