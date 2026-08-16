import { PageHeader } from "@animalesko/features/page-header";
import { PaymentView } from "@animalesko/features/payment-view";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagamento" };

/** Which booking is being paid comes from a search param, read by the view. */
export default function PaymentPage() {
  return (
    <Gated next="/historico">
      <PageHeader title="Pagamento" backTo="/historico" />
      <main className="mx-auto max-w-md p-4">
        <PaymentView />
      </main>
    </Gated>
  );
}
