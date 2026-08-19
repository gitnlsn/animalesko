"use client";

import { Card, ListSkeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@animalesko/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

import { BookingDialog } from "./booking-dialog.tsx";
import { ServiceCard } from "./service-card.tsx";
import { SERVICES_DEFAULT_TYPE, SERVICES_PAGE_LIMIT } from "../lib/query-inputs.ts";
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState<PublicOfferingDTO | null>(null);

  /**
   * Warms the three tabs the user is not looking at.
   *
   * Radix unmounts inactive `TabsContent`, so each `ServiceList` runs its query
   * on first mount — and a tab switch is a tap with no network already in
   * flight, which lands on a skeleton every time. Prefetching sidesteps that
   * without touching the tab semantics: the mounted list keeps its own
   * `useQuery`, the request is deduped against this one, and `staleTime` means
   * coming back to a tab reads the cache rather than refetching.
   *
   * Deliberately after the first paint rather than during it, so the four
   * requests do not compete with the one the visible tab needs.
   */
  useEffect(() => {
    for (const tab of TABS) {
      void queryClient.prefetchQuery(
        trpc.catalog.offerings.queryOptions({ type: tab.value, limit: SERVICES_PAGE_LIMIT }),
      );
    }
  }, [queryClient, trpc]);

  return (
    <>
      <Tabs defaultValue={SERVICES_DEFAULT_TYPE} className="w-full">
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
  const offerings = useQuery(
    trpc.catalog.offerings.queryOptions({ type, limit: SERVICES_PAGE_LIMIT }),
  );

  if (offerings.isPending) {
    return <ListSkeleton count={3} />;
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
