"use client";

import { formatAgePtBR, formatPrice } from "@animalesko/api/schemas";
import { Badge, Button, Card, CardContent, cn } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Heart, MapPin, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { petImage } from "../lib/display.ts";
import { useFavorites } from "../lib/use-favorites.ts";
import { useTRPC } from "../trpc.ts";

/**
 * The prototype kept favourites in `localStorage["favoritePets"]`, so they were
 * per-device and vanished with the cache. These are rows, shared across every
 * device the tutor signs in on.
 */
export function FavoritesList() {
  const trpc = useTRPC();
  const favorites = useFavorites();

  const listings = useQuery(trpc.favorite.listings.queryOptions());
  const offerings = useQuery(trpc.favorite.offerings.queryOptions());

  if (listings.isPending || offerings.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  const pets = listings.data ?? [];
  const services = offerings.data ?? [];

  if (pets.length === 0 && services.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Nenhum favorito ainda</h2>
          <p className="text-sm text-muted-foreground">
            Toque no coração de um pet ou serviço para guardá-lo aqui.
          </p>
          <Button asChild className="mt-2">
            <Link href="/adocao">Explorar pets</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {pets.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Heart size={18} className="text-secondary" />
            Pets ({pets.length})
          </h2>

          <div className="space-y-3">
            {pets.map((listing) => (
              <Card key={listing.id} className="overflow-hidden p-0">
                <CardContent className="flex gap-3 p-3">
                  <Link href={`/pet/${listing.id}`} className="relative size-20 shrink-0">
                    <Image
                      src={petImage(listing)}
                      alt={listing.pet.name}
                      fill
                      sizes="80px"
                      className="rounded-lg object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/pet/${listing.id}`}>
                      <h3 className="truncate font-semibold text-foreground">{listing.pet.name}</h3>
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {listing.pet.breed ?? "SRD"} · {formatAgePtBR(listing.pet.birthDate)}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin size={12} />
                      {listing.city}, {listing.state}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${listing.pet.name} dos favoritos`}
                    className="shrink-0 self-center text-destructive"
                    onClick={() => favorites.toggleListing(listing.id, "/favoritos")}
                  >
                    <Trash2 size={16} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {services.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar size={18} className="text-primary" />
            Serviços ({services.length})
          </h2>

          <div className="space-y-3">
            {services.map((offering) => (
              <Card key={offering.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate font-semibold text-foreground">
                      {offering.title}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">{offering.org.name}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">
                        {formatPrice(offering.priceCents, offering.priceUnit)}
                      </Badge>
                      {offering.org.ratingCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star size={12} className="fill-secondary text-secondary" />
                          {offering.org.ratingAvg.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <Button asChild size="sm">
                      <Link href="/servicos">Agendar</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("text-destructive")}
                      onClick={() => favorites.toggleOffering(offering.id, "/favoritos")}
                    >
                      <Trash2 size={14} />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
