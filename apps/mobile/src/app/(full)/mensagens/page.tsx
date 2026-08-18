import { MessagesScreen } from "@animalesko/features/messages-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mensagens" };

export default function Page() {
  return (
    <Gated next="/mensagens">
      <MessagesScreen />
    </Gated>
  );
}
