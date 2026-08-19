"use client";

import { POINTS } from "@animalesko/api/schemas";
import { Badge, Button, Card, Progress, Skeleton, cn } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { Award, Trophy } from "lucide-react";

import { GAMIFICATION_PROFILE_INPUT } from "../lib/query-inputs.ts";
import { useTRPC } from "../trpc.ts";

/**
 * "Pontos Aumigos".
 *
 * Read-only, and there is no `addPoints` anywhere on the client: points are
 * awarded server-side by the action that earns them. The prototype exposed
 * `addPoints(n, reason)` to every component and stored the total in
 * `localStorage`, so the score was both unauditable and free to mint.
 *
 * Every badge is listed, earned or not, so the card shows what is still to
 * play for — the prototype rendered only unlocked ones and hid the rest.
 */
export function GamificationProfile() {
  const trpc = useTRPC();
  const profile = useQuery(trpc.gamification.profile.queryOptions(GAMIFICATION_PROFILE_INPUT));

  if (profile.isPending) {
    return <GamificationSkeleton />;
  }

  /*
   * A failed request used to `return null`, which deleted this whole block from
   * the middle of the Perfil tab — permanently, silently, and with no way back
   * short of killing the app. The section is small enough that a retry fits
   * inside the space it was going to occupy anyway.
   */
  if (!profile.data) {
    return (
      <Card className="bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar seus Pontos Aumigos.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          loading={profile.isFetching}
          onClick={() => void profile.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    );
  }

  const { points, level, nextLevel, progress, badges } = profile.data;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card p-4 shadow-brand-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary" size={20} />
            <h3 className="font-semibold text-foreground">Nível atual</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl">{level.icon}</div>
            <Badge variant="secondary" className="text-xs">
              Nível {level.level}
            </Badge>
          </div>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">{level.name}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{points} Pontos Aumigos</span>
            {nextLevel ? <span>{nextLevel.minPoints} pts</span> : <span>Nível máximo</span>}
          </div>
          <Progress value={progress} />
          {nextLevel ? (
            <p className="text-center text-xs text-muted-foreground">
              Próximo: {nextLevel.name} {nextLevel.icon}
            </p>
          ) : null}
        </div>
      </Card>

      {badges.length > 0 ? (
        <Card className="bg-gradient-card p-4 shadow-brand-md">
          <div className="mb-3 flex items-center gap-2">
            <Award className="text-accent" size={20} />
            <h3 className="font-semibold text-foreground">Badges</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.code}
                // No hover tint: a badge is a read-only trophy, and lighting it
                // up under the cursor promised a tap that does not exist.
                className={cn(
                  "flex items-center gap-2 rounded-lg p-2",
                  badge.earned ? "bg-muted/50" : "opacity-50 grayscale",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {badge.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{badge.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="bg-muted/30 p-4">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Como ganhar pontos:</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>🐕 Enviar pedido de adoção: +{POINTS.ADOPTION_APPLICATION} pts</li>
          <li>⭐ Avaliar prestador: +{POINTS.REVIEW_CREATED} pts</li>
          <li>💚 Favoritar pet: +{POINTS.FAVORITE_ADDED} pts</li>
          <li>🚨 Ajudar no Pet Alert: +{POINTS.ALERT_SIGHTING} pts</li>
        </ul>
      </Card>
    </div>
  );
}

/**
 * Three stacked cards, because that is what arrives.
 *
 * This used to borrow `StatGridSkeleton count={3}` — a three-column row about
 * 80px tall standing in for three full-width cards well past 400px. Wrong axis
 * and a fifth of the height, so the placeholder said "a strip of counters" and
 * the tab then shoved half a screen of content down to make room. The static
 * chrome (headings, the badge grid's shape) is kept so only the numbers pop in.
 */
function GamificationSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card p-4 shadow-brand-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>

        <Skeleton className="mb-2 h-5 w-40" />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="mx-auto h-4 w-40" />
        </div>
      </Card>

      <Card className="bg-gradient-card p-4 shadow-brand-md">
        <Skeleton className="mb-3 h-6 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-2 p-2">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-muted/30 p-4">
        <Skeleton className="mb-2 h-5 w-44" />
        <div className="space-y-1">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
