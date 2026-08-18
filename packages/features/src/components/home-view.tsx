"use client";

import { Button, Card, Skeleton } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Heart } from "lucide-react";
import Link from "next/link";

import { PetCard } from "./pet-card.tsx";
import { PetOfTheDay } from "./pet-of-the-day.tsx";
import { StatsCard } from "./stats-card.tsx";
import { HOME_RECENT_LISTINGS_INPUT } from "../lib/query-inputs.ts";
import { useTRPC } from "../trpc.ts";

/**
 * Início — the prototype's `home` tab.
 *
 * Fetches its own three queries rather than taking them as props. On the web
 * the page still prefetches them on the server, so this hydrates already
 * populated and nothing renders a skeleton; in the native bundle there is no
 * server, so the skeletons below are what the first paint actually shows.
 * Either way the markup lives in one place instead of once per host.
 */
export function HomeView() {
  const trpc = useTRPC();

  const petOfTheDay = useQuery(trpc.catalog.petOfTheDay.queryOptions());
  const stats = useQuery(trpc.catalog.stats.queryOptions());
  const recent = useQuery(trpc.catalog.listings.queryOptions(HOME_RECENT_LISTINGS_INPUT));

  return (
    <div className="space-y-6">
      {petOfTheDay.isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : petOfTheDay.data ? (
        <PetOfTheDay listing={petOfTheDay.data} />
      ) : null}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-gradient-foreground shadow-brand-lg">
        <h2 className="mb-2 text-2xl font-bold">Encontre seu novo melhor amigo</h2>
        <p className="mb-4 text-gradient-foreground/90">
          {stats.isPending
            ? "Carregando…"
            : stats.data?.availableListings === 0
              ? "Nenhum pet aguardando no momento."
              : stats.data?.availableListings === 1
                ? "1 pet esperando por uma família"
                : `${stats.data?.availableListings ?? 0} pets esperando por uma família`}
        </p>
        <Button asChild variant="secondary" className="font-medium">
          <Link href="/adocao">Ver pets disponíveis</Link>
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard
          title="Pets adotados"
          value={stats.data?.adoptedThisMonth ?? 0}
          subtitle="Este mês"
          icon={Heart}
        />
        <StatsCard
          title="Serviços"
          value={stats.data?.bookingsThisMonth ?? 0}
          subtitle="Agendamentos este mês"
          icon={Calendar}
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link href="/adocao">
              <Heart size={20} />
              <span>Adotar pet</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link href="/servicos">
              <Calendar size={20} />
              <span>Agendar serviço</span>
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pets recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/adocao">Ver todos</Link>
          </Button>
        </div>

        {recent.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        ) : (recent.data?.length ?? 0) === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum pet disponível ainda.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {recent.data?.map((listing) => (
              <PetCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
