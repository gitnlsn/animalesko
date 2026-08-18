"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
import { Badge, Button, Card, cn } from "@animalesko/ui";
import { Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { petImage } from "../lib/display.ts";
import { useFavorites } from "../lib/use-favorites.ts";

import type { PublicListingDTO } from "@animalesko/api";

/**
 * Today's featured animal.
 *
 * The listing is chosen on the server by day index, not by `Math.random()` in
 * an effect with the result cached in `localStorage`. That prototype version
 * was per-device, re-rolled whenever storage was cleared, and rendered nothing
 * at all on the first paint.
 */
export function PetOfTheDay({ listing }: { listing: PublicListingDTO }) {
  const favorites = useFavorites();
  const href = `/pet/${listing.id}`;
  const isFavorited = favorites.isListingFavorited(listing.id);

  return (
    <Card className="animate-in overflow-hidden bg-gradient-card p-0 shadow-brand-lg fade-in">
      <div className="flex items-center gap-2 bg-gradient-primary p-3">
        <Sparkles className="text-gradient-foreground" size={20} />
        <h2 className="text-lg font-bold text-gradient-foreground">🐾 Pet do Dia</h2>
      </div>

      <div className="flex gap-4 p-4">
        <div className="relative shrink-0">
          <div className="relative size-24 overflow-hidden rounded-lg">
            <Image
              src={petImage(listing)}
              alt={listing.pet.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <button
            type="button"
            aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-pressed={isFavorited}
            onClick={() => favorites.toggleListing(listing.id, "/")}
            className={cn(
              "absolute -top-1 -right-1 rounded-full p-1.5 shadow-brand-md transition-smooth",
              isFavorited
                ? "bg-secondary text-secondary-foreground"
                : "bg-card text-muted-foreground hover:text-secondary",
            )}
          >
            <Heart size={14} className={cn("transition-smooth", isFavorited && "fill-current")} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{listing.pet.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {formatAgePtBR(listing.pet.birthDate)}
            </Badge>
          </div>
          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{listing.summary}</p>
          <Button asChild size="sm" className="w-full">
            <Link href={href}>Ver perfil</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
