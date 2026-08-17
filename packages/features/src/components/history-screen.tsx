"use client";

import { PageHeader } from "./page-header.tsx";
import { ServiceHistory } from "./service-history.tsx";

/** Histórico de serviços — reached from Perfil, gated by both hosts. */
export function HistoryScreen() {
  return (
    <>
      <PageHeader
        title="Histórico de serviços"
        subtitle="Tudo que você já agendou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <ServiceHistory />
      </main>
    </>
  );
}
