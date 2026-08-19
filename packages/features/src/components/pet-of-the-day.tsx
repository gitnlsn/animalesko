"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
import { Badge, Button, Card, Skeleton, cn } from "@animalesko/ui";
import { Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { petImage } from "../lib/display.ts";
import { getPlatform } from "../lib/platform.ts";
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
  // Through the adapter, never `/pet/${id}`: that route is not in the native
  // static export, so hardcoding it turns the home screen's headline tap into a
  // full WebView document load.
  const href = getPlatform().listingHref(listing.id);
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
          {/* The toggle is optimistic, so the fill lands on the frame of the
              tap — which `transition-smooth` used to smear over 300ms on both
              the button and the icon. Until `favoritesResolved` the answer is
              not known, so the heart is dimmed and carries no `aria-pressed`
              rather than claiming "not favourited" and correcting itself. */}
          <button
            type="button"
            aria-label={
              favorites.favoritesResolved
                ? isFavorited
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
                : "Favoritar"
            }
            aria-pressed={favorites.favoritesResolved ? isFavorited : undefined}
            onClick={() => favorites.toggleListing(listing.id, "/")}
            className={cn(
              "absolute -top-1 -right-1 rounded-full p-1.5 shadow-brand-md press-feedback active:scale-90",
              isFavorited
                ? "bg-secondary text-secondary-foreground"
                : "bg-card text-muted-foreground hover:text-secondary active:text-secondary",
              !favorites.favoritesResolved && "opacity-50",
            )}
          >
            <Heart size={14} className={cn(isFavorited && "fill-current")} />
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

/**
 * The same card with the data taken out.
 *
 * It lives here rather than in the skeleton library because its only job is to
 * be exactly as tall as the component above it — the home screen showed a
 * 256px block for a card that renders at ~190px, so the whole page slid up the
 * moment the query landed. Keeping the two in one file is what stops that gap
 * from reopening the next time the card's padding changes.
 */
export function PetOfTheDaySkeleton() {
  return (
    <Card className="overflow-hidden bg-gradient-card p-0 shadow-brand-lg">
      <div className="flex items-center gap-2 bg-gradient-primary p-3">
        <Sparkles className="text-gradient-foreground" size={20} />
        <h2 className="text-lg font-bold text-gradient-foreground">🐾 Pet do Dia</h2>
      </div>

      <div className="flex gap-4 p-4">
        <Skeleton className="size-24 shrink-0 rounded-lg" />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="mb-2 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    </Card>
  );
}
