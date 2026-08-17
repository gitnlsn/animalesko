import { HistoryScreen } from "@animalesko/features/history-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de serviços" };

export default function Page() {
  return (
    <Gated next="/historico">
      <HistoryScreen />
    </Gated>
  );
}
