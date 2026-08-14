import { Button, Card } from "@animalesko/ui";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Calendar, Heart } from "lucide-react";
import Link from "next/link";

import { PetCard } from "~/components/pet-card.tsx";
import { PetOfTheDay } from "~/components/pet-of-the-day.tsx";
import { StatsCard } from "~/components/stats-card.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

/**
 * Início — the prototype's `home` tab.
 *
 * Everything on it now comes from Postgres: the featured animal, the two stat
 * cards ("1.2k pets adotados", "350+ agendamentos" in the prototype) and the
 * recent-pets strip. Prefetched here and handed to the client already
 * populated, so the page has no request waterfall.
 */
export default async function HomePage() {
  const queryClient = getQueryClient();

  const [petOfTheDay, stats, recent] = await Promise.all([
    queryClient.fetchQuery(trpc.catalog.petOfTheDay.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.stats.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.listings.queryOptions({ limit: 2 })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        {petOfTheDay ? <PetOfTheDay listing={petOfTheDay} /> : null}

        <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-brand-lg">
          <h2 className="mb-2 text-2xl font-bold">Encontre seu novo melhor amigo</h2>
          <p className="mb-4 text-primary-foreground/90">
            {stats.availableListings === 0
              ? "Nenhum pet aguardando no momento."
              : stats.availableListings === 1
                ? "1 pet esperando por uma família"
                : `${stats.availableListings} pets esperando por uma família`}
          </p>
          <Button asChild variant="secondary" className="font-medium">
            <Link href="/adocao">Ver pets disponíveis</Link>
          </Button>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Pets adotados"
            value={stats.adoptedThisMonth}
            subtitle="Este mês"
            icon={Heart}
          />
          <StatsCard
            title="Serviços"
            value={stats.bookingsThisMonth}
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

          {recent.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum pet disponível ainda. Rode <code>pnpm db:seed</code> para popular.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {recent.map((listing) => (
                <PetCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </HydrationBoundary>
  );
}
