"use client";

import { formatPrice } from "@animalesko/api/schemas";
import { Badge, Button, Card, cn } from "@animalesko/ui";
import { BadgeCheck, Calendar, Clock, Heart, Star } from "lucide-react";

import { useFavorites } from "../lib/use-favorites.ts";

import type { PublicOfferingDTO } from "@animalesko/api";

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}

interface ServiceCardProps {
  offering: PublicOfferingDTO;
  onBook: (offering: PublicOfferingDTO) => void;
}

/**
 * A bookable service.
 *
 * Price, rating and duration all come from the row rather than the prototype's
 * hardcoded `price: "R$ 45/dia"`, `rating: 4.8`. The rating in particular is
 * the organization's denormalised average, kept current by the review path.
 */
export function ServiceCard({ offering, onBook }: ServiceCardProps) {
  const favorites = useFavorites();
  const isFavorited = favorites.isOfferingFavorited(offering.id);
  const duration = formatDuration(offering.durationMinutes);

  return (
    <Card className="bg-gradient-card p-4 shadow-brand-md transition-smooth hover:shadow-brand-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{offering.title}</h3>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            {offering.org.name}
            {offering.org.verificationStatus === "APPROVED" ? (
              <BadgeCheck size={14} className="shrink-0 text-primary" aria-label="Verificado" />
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {formatPrice(offering.priceCents, offering.priceUnit)}
          </span>
          {/* The toggle is optimistic, so the fill lands with the tap; a 300ms
              `transition-smooth` used to smear it out of existence. And until
              `favoritesResolved` the answer is unknown, so the heart is dimmed
              and drops `aria-pressed` rather than claiming "not favourited". */}
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
            onClick={() => favorites.toggleOffering(offering.id, "/servicos")}
            className={cn(
              "rounded-full p-1.5 press-feedback active:scale-90",
              isFavorited
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-secondary active:text-secondary",
              !favorites.favoritesResolved && "opacity-50",
            )}
          >
            <Heart size={14} className={cn(isFavorited && "fill-current")} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-4">
        {offering.org.ratingCount > 0 ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star size={14} className="fill-secondary text-secondary" />
            <span>{offering.org.ratingAvg.toFixed(1)}</span>
            <span className="text-xs">({offering.org.ratingCount})</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Ainda sem avaliações</span>
        )}

        {duration ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock size={14} />
            <span>{duration}</span>
          </div>
        ) : null}
      </div>

      {offering.description ? (
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{offering.description}</p>
      ) : null}

      {offering.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {offering.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <Button className="w-full" onClick={() => onBook(offering)}>
        <Calendar size={16} />
        Agendar
      </Button>
    </Card>
  );
}
