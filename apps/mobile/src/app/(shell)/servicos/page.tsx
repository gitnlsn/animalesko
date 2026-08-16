import { ServicesBrowser } from "@animalesko/features/services-browser";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Serviços" };

export default function ServicesPage() {
  return <ServicesBrowser />;
}
