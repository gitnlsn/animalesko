import { ReviewsScreen } from "@animalesko/features/reviews-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avaliações" };

export default function Page() {
  return (
    <Gated next="/avaliacoes">
      <ReviewsScreen />
    </Gated>
  );
}
