"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
import { Badge, Button, Card, cn, toast } from "@animalesko/ui";
import { Clock, Heart, MapPin, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SEX_LABELS, SIZE_LABELS, petImage } from "~/lib/display.ts";
import { useFavorites } from "~/lib/use-favorites.ts";

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
  const router = useRouter();
  const favorites = useFavorites();

  const href = `/pet/${listing.id}`;
  const isFavorited = favorites.isListingFavorited(listing.id);

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}${href}`;
    const data = {
      title: `Conheça ${listing.pet.name}!`,
      text: `🐾 ${listing.summary}\n\nDisponível para adoção na Animalesko 💚`,
      url,
    };

    // navigator.share is unavailable on desktop browsers and outside secure
    // contexts, so the clipboard is the fallback rather than an error.
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // The user dismissing the sheet is not a failure worth reporting.
        if ((error as Error).name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copiado! 📋", { description: "Cole o link para compartilhar este pet" });
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
          swallows the click on some browsers. */}
      <button
        type="button"
        aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={isFavorited}
        onClick={() => favorites.toggleListing(listing.id, href)}
        className={cn(
          "absolute top-3 right-3 rounded-full p-2 shadow-brand-md transition-smooth",
          isFavorited
            ? "bg-secondary text-secondary-foreground"
            : "bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-secondary",
        )}
      >
        <Heart size={16} className={cn("transition-smooth", isFavorited && "fill-current")} />
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
              onClick={share}
            >
              <Share2 size={14} />
            </Button>
            <Button size="sm" className="text-xs" onClick={() => router.push(href)}>
              Ver detalhes
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
