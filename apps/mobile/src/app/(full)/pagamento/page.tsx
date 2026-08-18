import { PaymentScreen } from "@animalesko/features/payment-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagamento" };

/** Which booking is being paid comes from a search param, read by the view. */
export default function Page() {
  return (
    <Gated next="/historico">
      <PaymentScreen />
    </Gated>
  );
}
