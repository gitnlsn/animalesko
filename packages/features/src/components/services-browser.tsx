"use client";

import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useState } from "react";

import { BookingDialog } from "./booking-dialog.tsx";
import { ServiceCard } from "./service-card.tsx";
import { useTRPC } from "../trpc.ts";

import type { PublicOfferingDTO } from "@animalesko/api";
import type { ServiceType } from "@animalesko/api/schemas";

/**
 * The four tabs the prototype hardcoded. Two of them ("Creche", "Hotel") were
 * permanent "em breve" placeholders because the mock array only had a sitter
 * and a walker; here they are real queries that happen to be empty until a
 * provider publishes one.
 */
const TABS: { value: ServiceType; label: string }[] = [
  { value: "PET_SITTER", label: "Pet Sitter" },
  { value: "DOG_WALKER", label: "Dog Walker" },
  { value: "DAYCARE", label: "Creche" },
  { value: "HOTEL", label: "Hotel" },
];

export function ServicesBrowser() {
  const [booking, setBooking] = useState<PublicOfferingDTO | null>(null);

  return (
    <>
      <Tabs defaultValue="PET_SITTER" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <ServiceList type={tab.value} label={tab.label} onBook={setBooking} />
          </TabsContent>
        ))}
      </Tabs>

      <BookingDialog offering={booking} onOpenChange={(open) => !open && setBooking(null)} />
    </>
  );
}

function ServiceList({
  type,
  label,
  onBook,
}: {
  type: ServiceType;
  label: string;
  onBook: (offering: PublicOfferingDTO) => void;
}) {
  const trpc = useTRPC();
  const offerings = useQuery(trpc.catalog.offerings.queryOptions({ type, limit: 50 }));

  if (offerings.isPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!offerings.data?.length) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <Calendar size={48} className="text-muted-foreground/50" />
        <p className="font-medium">Nenhum serviço de {label.toLowerCase()} por aqui</p>
        <p className="text-sm text-muted-foreground">
          Assim que um prestador publicar um, ele aparece nesta aba.
        </p>
      </Card>
    );
  }

  return (
    <>
      {offerings.data.map((offering) => (
        <ServiceCard key={offering.id} offering={offering} onBook={onBook} />
      ))}
    </>
  );
}
