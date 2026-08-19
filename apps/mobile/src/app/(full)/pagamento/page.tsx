import { PaymentScreen } from "@animalesko/features/payment-screen";
import { DetailSkeleton, PageHeaderSkeleton } from "@animalesko/ui";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagamento" };

/**
 * Which booking is being paid comes from a search param, read by the view.
 *
 * Which is also why no `next` is given: the gate returns to the current URL,
 * and a literal one would drop the `?agendamento=` that a signed-out deep link
 * arrived with — the user would sign in and land on a list instead of the
 * payment they opened.
 *
 * The placeholder is `PaymentScreen`'s own pending state, so the session window
 * and the booking request are one continuous skeleton rather than two.
 */
export default function Page() {
  return (
    <Gated
      skeleton={
        <>
          <PageHeaderSkeleton />
          <main className="mx-auto max-w-md p-4">
            <DetailSkeleton />
          </main>
        </>
      }
    >
      <PaymentScreen />
    </Gated>
  );
}
