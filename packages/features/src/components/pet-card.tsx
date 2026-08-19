"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
import { Badge, Button, Card, cn, toast } from "@animalesko/ui";
import { Clock, Heart, MapPin, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SEX_LABELS, SIZE_LABELS, petImage } from "../lib/display.ts";
import { getPlatform } from "../lib/platform.ts";
import { useFavorites } from "../lib/use-favorites.ts";

import type { PublicListingDTO } from "@animalesko/api";

/**
 * An adoption listing card.
 *
 * Takes the DTO rather than fifteen loose props. The prototype's version
 * received `age: "2 anos"` and `location: "São Paulo, SP"` as pre-formatted
 * strings, which is how they went stale — age is derived from `birthDate` here
 * and the location is assembled at render.
 */
export function PetCard({ listing }: { listing: PublicListingDTO }) {
  const favorites = useFavorites();
  const [sharing, setSharing] = useState(false);

  const href = getPlatform().listingHref(listing.id);
  const isFavorited = favorites.isListingFavorited(listing.id);

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Not `window.location.origin`: inside the native WebView that is
    // `capacitor://localhost`, and a shared link has to open the website — which
    // is also what serves the OpenGraph tags a WhatsApp preview reads. The path
    // is the site's `/pet/{id}` rather than `href`, because `href` is whatever
    // route *this* host uses internally and the native one is not on the web.
    const platform = getPlatform();
    const url = platform.publicUrl(`/pet/${listing.id}`);

    // Both the sheet and the clipboard are awaited, and on a cold share sheet
    // that gap is long enough to read as a dropped tap without a pending state.
    setSharing(true);
    try {
      // The share sheet is unavailable on desktop browsers and outside secure
      // contexts, so the clipboard is the fallback rather than an error.
      if (
        await platform.share({
          title: `Conheça ${listing.pet.name}!`,
          text: `🐾 ${listing.summary}\n\nDisponível para adoção na Animalesko 💚`,
          url,
        })
      ) {
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! 📋", { description: "Cole o link para compartilhar este pet" });
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="group relative overflow-hidden bg-gradient-card p-0 shadow-brand-md transition-smooth hover:shadow-brand-lg">
      <Link href={href} className="block">
        <div className="relative aspect-4/3 overflow-hidden">
          <Image
            src={petImage(listing)}
            alt={listing.pet.name}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover transition-smooth group-hover:scale-105"
          />

          <div className="absolute bottom-3 left-3 flex gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {SEX_LABELS[listing.pet.sex]}
            </Badge>
            {listing.pet.size ? (
              <Badge variant="outline" className="bg-card/80 text-xs backdrop-blur-sm">
                {SIZE_LABELS[listing.pet.size]}
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Outside the Link: a button nested in an anchor is invalid markup and
          swallows the click on some browsers.

          The toggle is optimistic, so the fill lands on the same frame as the
          tap — which is exactly what `transition-smooth` used to throw away by
          easing it in over 300ms. Until `favoritesResolved` the answer is not
          known yet, so the heart is dimmed and carries no `aria-pressed` rather
          than stating "not favourited" and correcting itself a moment later. */}
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
        onClick={() => favorites.toggleListing(listing.id, href)}
        className={cn(
          "absolute top-3 right-3 rounded-full p-2 shadow-brand-md press-feedback active:scale-90",
          isFavorited
            ? "bg-secondary text-secondary-foreground"
            : "bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-secondary active:text-secondary",
          !favorites.favoritesResolved && "opacity-50",
        )}
      >
        <Heart size={16} className={cn(isFavorited && "fill-current")} />
      </button>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-foreground">{listing.pet.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{listing.pet.breed ?? "SRD"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{formatAgePtBR(listing.pet.birthDate)}</span>
          </div>
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{listing.summary}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">
              {listing.city}, {listing.state}
            </span>
          </div>

          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="size-8 p-0"
              aria-label="Compartilhar"
              loading={sharing}
              onClick={share}
            >
              {sharing ? null : <Share2 size={14} />}
            </Button>
            {/* An anchor rather than `router.push`: the same href the card
                already links to, so the route is prefetched and the tap is a
                client transition instead of a cold one. */}
            <Button asChild size="sm" className="text-xs">
              <Link href={href}>Ver detalhes</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
